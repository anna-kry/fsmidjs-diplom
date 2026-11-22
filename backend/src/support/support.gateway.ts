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
import { SupportRequestService } from './support-request.service';

/**
 * WebSocket-шлюз чата поддержки.
 *
 * Сообщения создаёт REST API (POST /common/support-requests/:id/messages),
 * шлюз только рассылает их участникам комнаты обращения — второго механизма
 * отправки сообщений здесь нет.
 */
@Injectable()
@WebSocketGateway()
export class SupportGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);
  private unsubscribeFromMessages?: () => void;

  constructor(
    private readonly supportService: SupportRequestService,
    private readonly usersService: UsersService,
  ) {}

  /** Подписка на новые сообщения выполняется один раз при старте шлюза. */
  onModuleInit(): void {
    this.unsubscribeFromMessages = this.supportService.subscribe(
      (supportRequest, message) => {
        // Обработчик события синхронный, поэтому уход отправки «в фон»;
        // ошибка рассылки не должна прерывать работу EventEmitter.
        void this.sendNewMessage(supportRequest, message);
      },
    );
  }

  /** Отписка от события при остановке модуля. */
  onModuleDestroy(): void {
    this.unsubscribeFromMessages?.();
    this.unsubscribeFromMessages = undefined;
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

    // Адаптер отклоняет неаутентифицированные соединения на handshake;
    // здесь защищаемся на случай, если адаптер не подключён.
    if (!user) {
      throw new WsException({ code: 401, message: 'Требуется аутентификация' });
    }
    // Зеркало @Roles('client', 'manager') у CommonSupportController.
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
        // Пользователь удалён вместе с сообщениями (CASCADE) — отправлять некому.
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
