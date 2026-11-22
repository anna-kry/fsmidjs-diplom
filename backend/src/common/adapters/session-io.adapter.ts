import type { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Request, RequestHandler, Response } from 'express';
import type { Server, ServerOptions, Socket } from 'socket.io';
import type { User } from '../../users/entities/user.entity';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

/** HTTP-запрос handshake с полем user, которое добавляет passport. */
type SessionRequest = Request & { user?: User };

/**
 * Последовательно выполняет middleware на паре (req, res).
 * Ошибка любого middleware завершает промис отказом.
 */
function runMiddlewareChain(
  req: Request,
  res: Response,
  middlewares: RequestHandler[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    let index = 0;
    const next = (error?: unknown): void => {
      if (error) {
        reject(error);
        return;
      }
      const middleware = middlewares[index];
      if (!middleware) {
        resolve();
        return;
      }
      index += 1;
      try {
        middleware(req, res, next);
      } catch (err) {
        reject(err);
      }
    };
    next();
  });
}

/**
 * Заглушка ответа: express-session оборачивает res.end и подписывается на
 * res.writeHead (пакет on-headers), поэтому методы должны существовать.
 * Реального ответа Socket.IO не отправляет — handshake обрабатывает сам сокет.
 */
function createResponseStub(): Response {
  const headers = new Map<string, string | number | readonly string[]>();
  const stub = {
    statusCode: 200,
    writeHead() {},
    write() {},
    end() {},
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name.toLowerCase(), value);
    },
    removeHeader(name: string) {
      headers.delete(name.toLowerCase());
    },
  };
  return stub as unknown as Response;
}

/**
 * Адаптер Socket.IO с проверкой сессии на этапе handshake.
 *
 * Те же session-middleware, что обслуживают HTTP-запросы, выполняются и на
 * запросе подключения: одна cookie sid — одна сессия, поэтому сокет видит
 * пользователя, вошедшего через REST. Неаутентифицированный сокет отклоняется
 * до установления соединения.
 */
export class SessionIoAdapter extends IoAdapter {
  private readonly middlewares: RequestHandler[];

  constructor(app: INestApplication, middlewares: RequestHandler[]) {
    super(app);
    this.middlewares = middlewares;
  }

  create(
    port: number,
    options?: ServerOptions & { namespace?: string; server?: unknown },
  ): Server {
    const server = super.create(port, options);
    // Middleware сокета: без успешной проверки сессии соединение не устанавливается.
    server.use((socket, next) => this.authenticate(socket, next));
    return server;
  }

  private async authenticate(
    socket: Socket,
    next: (error?: Error) => void,
  ): Promise<void> {
    try {
      const request = socket.request as unknown as SessionRequest;
      await runMiddlewareChain(request, createResponseStub(), this.middlewares);

      if (!request.user) {
        next(new Error('Требуется аутентификация'));
        return;
      }

      // Пользователь берётся из проверенной сессии, а не из payload клиента.
      const user: AuthenticatedUser = {
        id: request.user.id,
        role: request.user.role,
      };
      socket.data.user = user;
      next();
    } catch (error) {
      // В лог не попадают cookie и содержимое сессии — только текст ошибки.
      this.logger.error(
        'Не удалось проверить сессию сокета',
        error instanceof Error ? error.message : String(error),
      );
      next(new Error('Не удалось проверить сессию'));
    }
  }
}
