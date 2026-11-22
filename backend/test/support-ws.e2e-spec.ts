// Изолированная конфигурация подключается первой — до импорта AppModule
// (ConfigModule читает .env при загрузке модуля).
import 'reflect-metadata';
import { TEST_DATABASE } from './setup-env';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import type { AddressInfo } from 'net';
import { Client } from 'pg';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { SessionIoAdapter } from '../src/common/adapters/session-io.adapter';
import { SupportGateway } from '../src/support/support.gateway';

jest.setTimeout(60000);

/** Payload события newMessage (спецификация, раздел 6.6). */
interface NewMessageEvent {
  id: number;
  createdAt: string;
  text: string;
  readAt: string | null;
  author: { id: number; name: string };
  supportRequestId: number;
}

const CLIENT = {
  email: 'client-ws@e2e.test',
  password: 'Client12345!',
  name: 'Клиент WebSocket',
};
const OTHER_CLIENT = {
  email: 'other-ws@e2e.test',
  password: 'Client12345!',
  name: 'Чужой клиент',
};

let app: INestApplication;
let server: ReturnType<typeof request>;
let baseUrl: string;

let clientCookie: string;
let otherClientCookie: string;
let managerCookie: string;
let adminCookie: string;
let clientUserId: number;
let requestId: number;
let otherRequestId: number;

let clientSocket: Socket;
let managerSocket: Socket;

const connectedSockets: Socket[] = [];

/** Полностью пересоздаёт тестовую базу (как в app.e2e-spec.ts). */
async function recreateTestDatabase(): Promise<void> {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'postgres',
  });

  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
  } finally {
    await client.end();
  }
}

/** Логин по REST и получение cookie: она же передаётся сокету в extraHeaders. */
async function login(email: string, password: string): Promise<string> {
  const res = await server.post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  // В типах superagent set-cookie объявлен строкой, в рантайме это массив.
  const cookies = res.headers['set-cookie'] as unknown as string[];
  expect(cookies?.length ?? 0).toBeGreaterThan(0);
  // Из заголовка Set-Cookie берётся пара name=value без атрибутов (Path, HttpOnly).
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

/** Ждёт одно событие сокета; по таймауту тест падает с понятной причиной. */
function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Событие «${event}» не пришло за ${timeoutMs} мс`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/**
 * Ждёт событие с нужными данными. Отбор нужен потому, что шлюз отправляет
 * newMessage асинхронно: событие предыдущего шага может прийти уже после
 * старта следующего.
 */
function waitForMatchingEvent<T>(
  socket: Socket,
  event: string,
  match: (payload: T) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const listener = (payload: T) => {
      if (!match(payload)) {
        return;
      }
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Событие «${event}» с нужными данными не пришло за ${timeoutMs} мс`));
    }, timeoutMs);
    socket.on(event, listener);
  });
}

/** Подключает сокет с cookie и ждёт успешного подключения. */
async function connectSocket(cookie: string): Promise<Socket> {
  const socket = io(baseUrl, {
    reconnection: false,
    timeout: 5000,
    extraHeaders: { Cookie: cookie },
  });
  connectedSockets.push(socket);
  await waitForEvent(socket, 'connect');
  return socket;
}

/** Подписка с ожиданием подтверждения (ack) от сервера. */
function subscribeToChat(socket: Socket, chatId: number): Promise<{ chatId: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Сервер не ответил на subscribeToChat')),
      5000,
    );
    socket.emit('subscribeToChat', chatId, (response: { chatId: number }) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

/** Ожидает отказ в подписке: сервер отвечает событием exception. */
function subscribeExpectingError(
  socket: Socket,
  chatId: number,
): Promise<{ code: number; message: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Сервер не вернул ошибку на subscribeToChat')),
      5000,
    );
    socket.once('exception', (payload: { code: number; message: string }) => {
      clearTimeout(timer);
      resolve(payload);
    });
    socket.emit('subscribeToChat', chatId, () => {
      clearTimeout(timer);
      reject(new Error('Ожидалась ошибка, но сервер подтвердил подписку'));
    });
  });
}

/** Комнаты сокета на сервере: так видно, состоялось ли join в комнату. */
function serverRooms(socketId: string): Set<string> {
  const gateway = app.get(SupportGateway);
  const serverSocket = gateway.server.sockets.sockets.get(socketId);
  return new Set(serverSocket ? [...serverSocket.rooms] : []);
}

beforeAll(async () => {
  await recreateTestDatabase();

  app = await NestFactory.create(AppModule, { logger: ['error'] });

  // Повторяет настройки src/main.ts.
  app.setGlobalPrefix('api');
  app.use(helmet());

  const configService = app.get(ConfigService);
  const middlewares = [
    session({
      name: 'sid',
      secret: configService.get<string>('app.session.secret'),
      resave: false,
      saveUninitialized: false,
      store: new session.MemoryStore(),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: configService.get<boolean>('app.session.cookieSecure'),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
    passport.initialize(),
    passport.session(),
  ];
  middlewares.forEach((middleware) => app.use(middleware));
  // Сокеты проверяют сессию теми же middleware.
  app.useWebSocketAdapter(new SessionIoAdapter(app, middlewares));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Слушатель нужен Socket.IO: он работает на том же http-сервере, что и REST.
  await app.listen(0, '127.0.0.1');
  baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  server = request(app.getHttpServer());

  const registerClient = await server.post('/api/client/register').send(CLIENT);
  expect(registerClient.status).toBe(201);
  clientCookie = await login(CLIENT.email, CLIENT.password);

  const registerOther = await server.post('/api/client/register').send(OTHER_CLIENT);
  expect(registerOther.status).toBe(201);
  otherClientCookie = await login(OTHER_CLIENT.email, OTHER_CLIENT.password);

  managerCookie = await login(
    process.env.SEED_MANAGER_EMAIL,
    process.env.SEED_MANAGER_PASSWORD,
  );
  adminCookie = await login(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);

  const me = await server.get('/api/auth/me').set('Cookie', clientCookie);
  expect(me.status).toBe(200);
  clientUserId = me.body.id;

  const created = await server
    .post('/api/client/support-requests')
    .set('Cookie', clientCookie)
    .send({ text: 'Обращение для WebSocket-тестов' });
  expect(created.status).toBe(201);
  requestId = created.body.id;

  const otherCreated = await server
    .post('/api/client/support-requests')
    .set('Cookie', otherClientCookie)
    .send({ text: 'Обращение чужого клиента' });
  expect(otherCreated.status).toBe(201);
  otherRequestId = otherCreated.body.id;
});

afterAll(async () => {
  connectedSockets.forEach((socket) => socket.close());
  await app.close();
});

describe('День 6: WebSocket и чат поддержки', () => {
  it('1. два аутентифицированных сокета подключаются', async () => {
    clientSocket = await connectSocket(clientCookie);
    managerSocket = await connectSocket(managerCookie);

    expect(clientSocket.connected).toBe(true);
    expect(managerSocket.connected).toBe(true);
  });

  it('2. клиент подписывается на своё обращение', async () => {
    const response = await subscribeToChat(clientSocket, requestId);

    expect(response).toEqual({ chatId: requestId });
    expect(serverRooms(clientSocket.id).has(`chat:${requestId}`)).toBe(true);
  });

  it('3. менеджер подписывается на то же обращение', async () => {
    const response = await subscribeToChat(managerSocket, requestId);

    expect(response).toEqual({ chatId: requestId });
    expect(serverRooms(managerSocket.id).has(`chat:${requestId}`)).toBe(true);
  });

  it('4. клиент отправляет сообщение через существующий REST API', async () => {
    const res = await server
      .post(`/api/common/support-requests/${requestId}/messages`)
      .set('Cookie', clientCookie)
      .send({ text: 'Здравствуйте, нужна помощь' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      createdAt: expect.any(String),
      text: 'Здравствуйте, нужна помощь',
      readAt: null,
      author: { id: clientUserId, name: CLIENT.name },
    });
  });

  it('5. менеджер получает событие newMessage без перезагрузки', async () => {
    // Событие шлюза приходит асинхронно после ответа REST, поэтому ждём
    // именно своё сообщение, а не первое подряд.
    const eventPromise = waitForMatchingEvent<NewMessageEvent>(
      managerSocket,
      'newMessage',
      (message) => message.text === 'Сообщение в реальном времени',
    );

    const res = await server
      .post(`/api/common/support-requests/${requestId}/messages`)
      .set('Cookie', clientCookie)
      .send({ text: 'Сообщение в реальном времени' });
    expect(res.status).toBe(201);

    const message = await eventPromise;
    expect(message).toEqual({
      id: res.body.id,
      createdAt: expect.any(String),
      text: 'Сообщение в реальном времени',
      readAt: null,
      author: { id: clientUserId, name: CLIENT.name },
      supportRequestId: requestId,
    });
  });

  it('6. чужой клиент не подписывается на чужое обращение', async () => {
    const otherSocket = await connectSocket(otherClientCookie);

    // Своё обращение подписывается: сокет работает, отказано именно в правах.
    await subscribeToChat(otherSocket, otherRequestId);
    expect(serverRooms(otherSocket.id).has(`chat:${otherRequestId}`)).toBe(true);

    const error = await subscribeExpectingError(otherSocket, requestId);
    expect(error).toEqual({ code: 403, message: 'Нет доступа к обращению' });
    expect(serverRooms(otherSocket.id).has(`chat:${requestId}`)).toBe(false);

    // Сообщение в чужое обращение до него не доходит.
    const received: NewMessageEvent[] = [];
    otherSocket.on('newMessage', (message: NewMessageEvent) => received.push(message));
    const res = await server
      .post(`/api/common/support-requests/${requestId}/messages`)
      .set('Cookie', clientCookie)
      .send({ text: 'Только для участников' });
    expect(res.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(received).toHaveLength(0);
    otherSocket.removeAllListeners('newMessage');
  });

  it('подписка на несуществующее обращение возвращает 404', async () => {
    const error = await subscribeExpectingError(clientSocket, 999999);

    expect(error).toEqual({ code: 404, message: 'Обращение не найдено' });
  });

  it('admin не подписывается на обращение: только client и manager', async () => {
    const adminSocket = await connectSocket(adminCookie);

    const error = await subscribeExpectingError(adminSocket, requestId);
    expect(error).toEqual({ code: 403, message: 'Недостаточно прав' });
    expect(serverRooms(adminSocket.id).has(`chat:${requestId}`)).toBe(false);
  });

  it('7. неаутентифицированный сокет не подключается', async () => {
    const socket = io(baseUrl, { reconnection: false, timeout: 5000 });
    connectedSockets.push(socket);

    const error = await waitForEvent<Error>(socket, 'connect_error');

    expect(socket.connected).toBe(false);
    expect(error.message).toBe('Требуется аутентификация');
  });

  it('8. после уничтожения модуля обработчик события отписывается', async () => {
    const emitter = app.get(EventEmitter2);
    expect(emitter.listenerCount('support.message')).toBe(1);

    const received: NewMessageEvent[] = [];
    const collect = (message: NewMessageEvent) => {
      if (message.text === 'После отписки') received.push(message);
    };
    clientSocket.on('newMessage', collect);
    managerSocket.on('newMessage', collect);

    app.get(SupportGateway).onModuleDestroy();
    expect(emitter.listenerCount('support.message')).toBe(0);

    const res = await server
      .post(`/api/common/support-requests/${requestId}/messages`)
      .set('Cookie', clientCookie)
      .send({ text: 'После отписки' });
    expect(res.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(received).toHaveLength(0);
  });
});
