// Важно: изолированная конфигурация подключается первой и должна выполниться
// до импорта AppModule (ConfigModule читает .env при загрузке модуля).
import 'reflect-metadata';
import { TEST_DATABASE } from './setup-env';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

let app: INestApplication;
let server: ReturnType<typeof request>;
let clientAgent: ReturnType<typeof request.agent>;
let adminAgent: ReturnType<typeof request.agent>;
let managerAgent: ReturnType<typeof request.agent>;

const CLIENT = {
  email: 'client-e2e@test.local',
  password: 'Passw0rd!',
  name: 'Тест Клиент',
  contactPhone: '+70000000000',
};

const CREATED_USER = {
  email: 'created-e2e@test.local',
  password: 'Passw0rd!',
  name: 'Созданный Пользователь',
  contactPhone: '+70000000001',
  role: 'manager',
};

/** Полностью пересоздаёт тестовую базу, чтобы результаты были воспроизводимы. */
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

beforeAll(async () => {
  await recreateTestDatabase();

  app = await NestFactory.create(AppModule, { logger: ['error'] });

  // Повторяет настройки src/main.ts: префикс, helmet, сессии, passport, ValidationPipe.
  app.setGlobalPrefix('api');
  app.use(helmet());

  const configService = app.get(ConfigService);
  app.use(
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
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  server = request(app.getHttpServer());
  clientAgent = request.agent(app.getHttpServer());
  adminAgent = request.agent(app.getHttpServer());
  managerAgent = request.agent(app.getHttpServer());
});

afterAll(async () => {
  await app?.close();
});

describe('День 2: аутентификация, авторизация, управление пользователями', () => {
  describe('POST /api/client/register', () => {
    it('создаёт клиента: 201, ответ {id, email, name} без passwordHash', async () => {
      const res = await server.post('/api/client/register').send(CLIENT);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        email: CLIENT.email,
        name: CLIENT.name,
      });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('повторный email: 400', async () => {
      const res = await server.post('/api/client/register').send(CLIENT);

      expect(res.status).toBe(400);
    });

    it('невалидные данные (пароль короче 8 символов): 400', async () => {
      const res = await server.post('/api/client/register').send({
        email: 'short-e2e@test.local',
        password: 'short',
        name: 'Короткий',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('неверный пароль: 401', async () => {
      const res = await server
        .post('/api/auth/login')
        .send({ email: CLIENT.email, password: 'wrong-password' });

      expect(res.status).toBe(401);
    });

    it('верный пароль: 200, тело без passwordHash и cookie sid со параметрами спецификации', async () => {
      const res = await clientAgent
        .post('/api/auth/login')
        .send({ email: CLIENT.email, password: CLIENT.password });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: expect.any(Number),
        email: CLIENT.email,
        name: CLIENT.name,
        contactPhone: CLIENT.contactPhone,
        role: 'client',
      });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');

      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toContain('sid=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Secure');

      // Срок жизни cookie — 7 дней.
      const expiresMatch = cookie.match(/Expires=([^;]+)/);
      expect(expiresMatch).not.toBeNull();
      const expiresAt = new Date(expiresMatch[1]).getTime();
      const week = 7 * 24 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThan(Date.now() + week - 5 * 60 * 1000);
      expect(expiresAt).toBeLessThan(Date.now() + week + 5 * 60 * 1000);
    });

    it('повторный вход уже авторизованного пользователя: 403', async () => {
      const res = await clientAgent
        .post('/api/auth/login')
        .send({ email: CLIENT.email, password: CLIENT.password });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/auth/me', () => {
    it('сессия сохраняется между запросами: 200 и текущий пользователь', async () => {
      const res = await clientAgent.get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: expect.any(Number),
        email: CLIENT.email,
        name: CLIENT.name,
        contactPhone: CLIENT.contactPhone,
        role: 'client',
      });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('без сессии: 401', async () => {
      const res = await server.get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/client/register для авторизованного', () => {
    it('уже вошедшему: 403', async () => {
      const res = await clientAgent
        .post('/api/client/register')
        .send({ ...CLIENT, email: 'another-e2e@test.local' });

      expect(res.status).toBe(403);
    });
  });

  describe('Матрица доступа 401/403', () => {
    beforeAll(async () => {
      await adminAgent
        .post('/api/auth/login')
        .send({
          email: process.env.SEED_ADMIN_EMAIL,
          password: process.env.SEED_ADMIN_PASSWORD,
        })
        .expect(200);
      await managerAgent
        .post('/api/auth/login')
        .send({
          email: process.env.SEED_MANAGER_EMAIL,
          password: process.env.SEED_MANAGER_PASSWORD,
        })
        .expect(200);
    });

    it('гость GET /api/admin/users: 401', async () => {
      const res = await server.get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('гость POST /api/admin/users: 401', async () => {
      const res = await server.post('/api/admin/users').send({});
      expect(res.status).toBe(401);
    });

    it('гость GET /api/manager/users: 401', async () => {
      const res = await server.get('/api/manager/users');
      expect(res.status).toBe(401);
    });

    it('client GET /api/admin/users: 403', async () => {
      const res = await clientAgent.get('/api/admin/users');
      expect(res.status).toBe(403);
    });

    it('client POST /api/admin/users: 403', async () => {
      const res = await clientAgent.post('/api/admin/users').send(CREATED_USER);
      expect(res.status).toBe(403);
    });

    it('client GET /api/manager/users: 403', async () => {
      const res = await clientAgent.get('/api/manager/users');
      expect(res.status).toBe(403);
    });

    it('manager GET /api/admin/users: 403', async () => {
      const res = await managerAgent.get('/api/admin/users');
      expect(res.status).toBe(403);
    });

    it('manager GET /api/manager/users: 200', async () => {
      const res = await managerAgent.get('/api/manager/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('admin GET /api/manager/users: 403', async () => {
      const res = await adminAgent.get('/api/manager/users');
      expect(res.status).toBe(403);
    });

    it('admin GET /api/admin/users: 200', async () => {
      const res = await adminAgent.get('/api/admin/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Управление пользователями (admin)', () => {
    it('создание пользователя: 201, роль из тела, без passwordHash', async () => {
      const res = await adminAgent.post('/api/admin/users').send(CREATED_USER);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        email: CREATED_USER.email,
        name: CREATED_USER.name,
        contactPhone: CREATED_USER.contactPhone,
        role: 'manager',
      });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('повторный email: 400', async () => {
      const res = await adminAgent.post('/api/admin/users').send(CREATED_USER);

      expect(res.status).toBe(400);
    });

    it('невалидная роль: 400', async () => {
      const res = await adminAgent.post('/api/admin/users').send({
        ...CREATED_USER,
        email: 'other-e2e@test.local',
        role: 'root',
      });

      expect(res.status).toBe(400);
    });

    it('фильтр email — частичное совпадение', async () => {
      const res = await adminAgent.get('/api/admin/users?email=client-e2e');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].email).toBe(CLIENT.email);
    });

    it('пагинация limit/offset', async () => {
      const first = await adminAgent.get('/api/admin/users?limit=1&offset=0');
      expect(first.status).toBe(200);
      expect(first.body).toHaveLength(1);

      const second = await adminAgent.get('/api/admin/users?limit=1&offset=1');
      expect(second.status).toBe(200);
      expect(second.body).toHaveLength(1);
      expect(second.body[0].id).not.toBe(first.body[0].id);
    });

    it('некорректный limit: 400', async () => {
      const res = await adminAgent.get('/api/admin/users?limit=abc');
      expect(res.status).toBe(400);
    });

    it('список admin без passwordHash', async () => {
      const res = await adminAgent.get('/api/admin/users');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('список manager без passwordHash', async () => {
      const res = await managerAgent.get('/api/manager/users');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('завершает сессию и удаляет cookie sid', async () => {
      const res = await clientAgent.post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(String(res.headers['set-cookie'])).toContain('sid=;');
    });

    it('после выхода /api/auth/me: 401', async () => {
      const res = await clientAgent.get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('повторный выход: 401', async () => {
      const res = await clientAgent.post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });
});
