import {
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import type { ID } from '../common/types/id.type';
import { UsersService } from '../users/users.service';
import type { SupportRequest } from './entities/support-request.entity';
import type { Message } from './entities/message.entity';
import { PresenceService } from './services/presence.service';
import { SupportRequestService } from './support-request.service';

/**
 * WebSocket-шлюз чата поддержки.
 *
 * Сообщения создаёт REST API (POST /common/support-requests/:id/messages),
 * шлюз только рассылает их участникам комнаты обращения — второго механизма
 * отправки сообщений здесь нет.
 *
 * Кроме того, шлюз отслеживает присутствие пользователей (подключения /
 * отключения сокетов) и рассылает события прочтения сообщений.
 */
@Injectable()
@WebSocketGateway()
export class SupportGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);
  private unsubscribeFromMessages?: () => void;
  private unsubscribeFromReads?: () => void;

  constructor(
    private readonly supportService: SupportRequestService,
    private readonly usersService: UsersService,
    private readonly presenceService: PresenceService,
  ) {}

  /** Подписка на события сервиса выполняется один раз при старте шлюза. */
  onModuleInit(): void {
    this.unsubscribeFromMessages = this.supportService.subscribe(
      (supportRequest, message) => {
        void this.sendNewMessage(supportRequest, message);
      },
    );
    this.unsubscribeFromReads = this.supportService.subscribeMessagesRead(
      (data) => {
        void this.broadcastMessagesRead(data);
      },
    );

    // Отслеживание присутствия: подключение / отключение сокетов.
    this.server.on('connection', (socket) => this.handleConnection(socket));
  }

  /** Отписка от событий при остановке модуля. */
  onModuleDestroy(): void {
    this.unsubscribeFromMessages?.();
    this.unsubscribeFromMessages = undefined;
    this.unsubscribeFromReads?.();
    this.unsubscribeFromReads = undefined;
  }

  private handleConnection(socket: Socket): void {
    const user = socket.data.user as AuthenticatedUser | undefined;
    if (!user) {
      // Сессия не прошла проверку — соединение не должно состояться,
      // но защищаемся на случай ошибочной настройки адаптера.
      socket.disconnect(true);
      return;
    }
    const { online } = this.presenceService.addConnection(user.id, socket.id);
    if (online) {
      this.server.emit('presenceChanged', { userId: user.id, online: true });
    }

    socket.on('disconnect', () => {
      const result = this.presenceService.removeConnection(socket.id);
      if (result && !result.online) {
        this.server.emit('presenceChanged', {
          userId: result.userId,
          online: false,
        });
      }
    });
  }

  /**
   * Добавляет сокет в комнату обращения `chat:{id}`.
   *
   * Проверка прав — тот же метод сервиса, что и в REST
   * GET /common/support-requests/:id/messages: клиент только на своё
   * обращение, менеджер на любое (404, если обращения нет).
   *
   * Payload — число chatId (спецификация, раздел 6.6).
   */
  @SubscribeMessage('subscribeToChat')
  async subscribeToChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() chatId: ID,
  ): Promise<{ chatId: ID }> {
    const user = client.data.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new WsException({ code: 401, message: 'Требуется аутентификация' });
    }
    if (user.role !== 'client' && user.role !== 'manager') {
      throw new WsException({ code: 403, message: 'Недостаточно прав' });
    }
    if (!Number.isInteger(chatId)) {
      throw new WsException({
        code: 400,
        message: 'Некорректный идентификатор обращения',
      });
    }

    try {
      await this.supportService.getMessages(
        chatId,
        user.id,
        user.role === 'manager',
      );
    } catch (error) {
      throw this.toWsException(error);
    }

    await client.join(`chat:${chatId}`);
    return { chatId };
  }

  /**
   * Подписка на изменения присутствия пользователя.
   * Клиент может отслеживать только собеседника по доступному ему обращению:
   * менеджер — любого клиента, клиент — любого менеджера.
   * Идентификатор берется из проверенной сессии (просмотр権ы проверяется
   * через существующий метод сервиса getMessages).
   */
  @SubscribeMessage('presence:subscribe')
  async presenceSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: ID },
  ): Promise<{ userId: ID; online: boolean }> {
    const viewer = client.data.user as AuthenticatedUser | undefined;
    if (!viewer) {
      throw new WsException({ code: 401, message: 'Требуется аутентификация' });
    }
    const { userId } = payload;
    if (!Number.isInteger(userId) || userId === viewer.id) {
      throw new WsException({ code: 400, message: 'Некорректный идентификатор пользователя' });
    }
    try {
      // Доступ к присутствию только собеседнику по обращению:
      // менеджер — любому клиенту, клиент — любому менеджеру (при наличии обращения).
      const target = await this.usersService.findById(userId);
      if (!target) {
        throw new WsException({ code: 404, message: 'Пользователь не найден' });
      }
      if (viewer.role === 'manager') {
        if (target.role !== 'client') {
          throw new WsException({ code: 403, message: 'Нет доступа к статусу пользователя' });
        }
      } else if (viewer.role === 'client') {
        if (target.role !== 'manager') {
          throw new WsException({ code: 403, message: 'Нет доступа к статусу пользователя' });
        }
        const requests = await this.supportService.findSupportRequests({
          user: viewer.id,
          isActive: true,
        });
        if (requests.length === 0) {
          throw new WsException({ code: 403, message: 'Нет доступа к статусу пользователя' });
        }
      }
      // Определяем онлайн-статус цели и подписываем сокет на её изменения.
      const online = this.presenceService.isOnline(userId);
      await client.join(`presence:${userId}`);
      return { userId, online };
    } catch (error) {
      if (error instanceof WsException) throw error;
      throw this.toWsException(error);
    }
  }

  @SubscribeMessage('presence:unsubscribe')
  async presenceUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: ID },
  ): Promise<{ userId: ID }> {
    const { userId } = payload;
    if (Number.isInteger(userId)) {
      await client.leave(`presence:${userId}`);
    }
    return { userId };
  }

  /**
   * Отправляет новое сообщение всем подписчикам комнаты обращения.
   *
   * Форма события совпадает с ответом REST GET /common/support-requests/:id/messages
   * и дополнительно содержит supportRequestId — по нему клиент понимает,
   * к какому чату относится сообщение.
   */
  private async sendNewMessage(
    supportRequest: SupportRequest,
    message: Message,
  ): Promise<void> {
    try {
      const author = await this.usersService.findById(message.authorId);
      if (!author) {
        return;
      }
      this.server.to(`chat:${supportRequest.id}`).emit('newMessage', {
        id: message.id,
        createdAt: message.sentAt,
        text: message.text,
        readAt: message.readAt,
        author: { id: author.id, name: author.name },
        supportRequestId: supportRequest.id,
      });
    } catch (error) {
      this.logger.error(
        `Не удалось отправить newMessage для обращения ${supportRequest.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Рассылает событие прочтения сообщений участникам комнаты обращения. */
  private async broadcastMessagesRead(data: {
    supportRequestId: ID;
    readerId: ID;
    createdBefore: Date;
  }): Promise<void> {
    try {
      this.server.to(`chat:${data.supportRequestId}`).emit('messagesRead', {
        supportRequestId: data.supportRequestId,
        readerId: data.readerId,
        readAt: data.createdBefore,
      });
    } catch (error) {
      this.logger.error(
        `Не удалось отправить messagesRead для обращения ${data.supportRequestId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Ошибка REST-сервиса превращается в формат WS: клиенту нужны код и текст. */
  private toWsException(error: unknown): WsException {
    if (error instanceof HttpException) {
      return new WsException({
        code: error.getStatus(),
        message: error.message,
      });
    }
    this.logger.error(
      'Не удалось проверить права на обращение',
      error instanceof Error ? error.stack : String(error),
    );
    return new WsException({ code: 500, message: 'Внутренняя ошибка сервера' });
  }
}
