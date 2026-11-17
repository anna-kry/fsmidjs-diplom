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

describe('День 3: библиотеки и книги', () => {
  let day3Admin: ReturnType<typeof request.agent>;
  let day3Client: ReturnType<typeof request.agent>;

  // Созданные в тестах сущности.
  let libraryId: number;
  let secondLibraryId: number;
  let bookId: number;
  let bookCoverUrl: string;

  // 1x1 PNG для проверки загрузки обложки.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const DAY3_CLIENT = {
    email: 'client-day3@test.local',
    password: 'Passw0rd!',
    name: 'Клиент Дня 3',
  };

  beforeAll(async () => {
    day3Admin = request.agent(app.getHttpServer());
    await day3Admin
      .post('/api/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
      })
      .expect(200);

    day3Client = request.agent(app.getHttpServer());
    // 400 допустим, если клиент уже создан (повторный запуск спеки).
    const registerRes = await day3Client
      .post('/api/client/register')
      .send(DAY3_CLIENT);
    expect([201, 400]).toContain(registerRes.status);
    await day3Client
      .post('/api/auth/login')
      .send({ email: DAY3_CLIENT.email, password: DAY3_CLIENT.password })
      .expect(200);
  });

  describe('Публичные маршруты', () => {
    it('гость GET /api/common/libraries: 200 и массив', async () => {
      const res = await server.get('/api/common/libraries');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
    });

    it('гость GET /api/common/books: 200 и массив', async () => {
      const res = await server.get('/api/common/books');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('CRUD библиотек (admin)', () => {
    it('создание первой библиотеки: 201', async () => {
      const res = await day3Admin.post('/api/admin/libraries').send({
        name: 'Библиотека Дня 3',
        address: 'ул. Тестовая, 3',
        description: 'Описание библиотеки',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Библиотека Дня 3',
        address: 'ул. Тестовая, 3',
        description: 'Описание библиотеки',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      libraryId = res.body.id;
    });

    it('создание второй библиотеки: 201', async () => {
      const res = await day3Admin.post('/api/admin/libraries').send({
        name: 'Фильтрованная библиотека',
        address: 'пр. Научный, 1',
      });

      expect(res.status).toBe(201);
      secondLibraryId = res.body.id;
      expect(res.body.description).toBeNull();
    });

    it('гость POST /api/admin/libraries: 401', async () => {
      const res = await server
        .post('/api/admin/libraries')
        .send({ name: 'Гостевая', address: 'ул. Гостевая, 1' });

      expect(res.status).toBe(401);
    });

    it('client POST /api/admin/libraries: 403', async () => {
      const res = await day3Client
        .post('/api/admin/libraries')
        .send({ name: 'Клиентская', address: 'ул. Клиентская, 1' });

      expect(res.status).toBe(403);
    });

    it('пустое name: 400', async () => {
      const res = await day3Admin
        .post('/api/admin/libraries')
        .send({ name: '', address: 'ул. Тестовая, 3' });

      expect(res.status).toBe(400);
    });

    it('GET /api/common/libraries/:id: 200', async () => {
      const res = await server.get(`/api/common/libraries/${libraryId}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Библиотека Дня 3');
    });

    it('GET /api/common/libraries/:id несуществующей: 404', async () => {
      const res = await server.get('/api/common/libraries/999999');

      expect(res.status).toBe(404);
    });

    it('нечисловой id: 400', async () => {
      const res = await server.get('/api/common/libraries/abc');

      expect(res.status).toBe(400);
    });

    it('пагинация limit=1: возвращается одна библиотека', async () => {
      const res = await server.get('/api/common/libraries?limit=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('PUT /api/admin/libraries/:id: 200, поля обновлены', async () => {
      const res = await day3Admin
        .put(`/api/admin/libraries/${libraryId}`)
        .send({ description: 'Обновлённое описание' });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Обновлённое описание');
      expect(res.body.name).toBe('Библиотека Дня 3');
    });

    it('PUT несуществующей библиотеки: 404', async () => {
      const res = await day3Admin
        .put('/api/admin/libraries/999999')
        .send({ name: 'Нет' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/books: multipart с обложкой', () => {
    it('создание книги с изображением: 201, coverImage ведёт в /uploads/', async () => {
      const res = await day3Admin
        .post('/api/admin/books')
        .field('title', 'Преступление и наказание')
        .field('author', 'Фёдор Достоевский')
        .field('year', '1866')
        .field('description', 'Роман о Раскольникове')
        .field('libraryId', String(libraryId))
        .field('totalCopies', '2')
        .attach('coverImage', PNG, {
          filename: 'cover.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        title: 'Преступление и наказание',
        author: 'Фёдор Достоевский',
        year: 1866,
        description: 'Роман о Раскольникове',
        coverImage: expect.stringMatching(/^\/uploads\/.+\.png$/),
        isAvailable: true,
        totalCopies: 2,
        availableCopies: 2,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        library: {
          id: libraryId,
          name: 'Библиотека Дня 3',
          address: 'ул. Тестовая, 3',
        },
      });
      bookId = res.body.id;
      bookCoverUrl = res.body.coverImage;
    });

    it('файл открывается через /uploads/...', async () => {
      const res = await server.get(bookCoverUrl);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
    });

    it('книга без обложки: 201, coverImage null', async () => {
      const res = await day3Admin.post('/api/admin/books').field(
        'title',
        'Мастер и Маргарита',
      )
        .field('author', 'Михаил Булгаков')
        .field('libraryId', String(libraryId))
        .field('totalCopies', '3');

      expect(res.status).toBe(201);
      expect(res.body.coverImage).toBeNull();
      expect(res.body.availableCopies).toBe(3);
    });

    it('книга во второй библиотеке: 201', async () => {
      const res = await day3Admin
        .post('/api/admin/books')
        .field('title', 'Война и мир')
        .field('author', 'Лев Толстой')
        .field('libraryId', String(secondLibraryId))
        .field('totalCopies', '1');

      expect(res.status).toBe(201);
      expect(res.body.library.id).toBe(secondLibraryId);
    });

    it('неподдерживаемый тип файла: 400', async () => {
      const res = await day3Admin
        .post('/api/admin/books')
        .field('title', 'Текстовая книга')
        .field('author', 'Автор')
        .field('libraryId', String(libraryId))
        .field('totalCopies', '1')
        .attach('coverImage', Buffer.from('hello'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
    });

    it('файл больше 2 МБ: 400', async () => {
      const tooBig = Buffer.alloc(2 * 1024 * 1024 + 1, 1);
      const res = await day3Admin
        .post('/api/admin/books')
        .field('title', 'Большая книга')
        .field('author', 'Автор')
        .field('libraryId', String(libraryId))
        .field('totalCopies', '1')
        .attach('coverImage', tooBig, {
          filename: 'big.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
    });

    it('несуществующая библиотека: 400', async () => {
      const res = await day3Admin
        .post('/api/admin/books')
        .field('title', 'Книга без библиотеки')
        .field('author', 'Автор')
        .field('libraryId', '999999')
        .field('totalCopies', '1');

      expect(res.status).toBe(400);
    });

    it('без totalCopies: 400', async () => {
      const res = await day3Admin
        .post('/api/admin/books')
        .field('title', 'Книга без счётчика')
        .field('author', 'Автор')
        .field('libraryId', String(libraryId));

      expect(res.status).toBe(400);
    });

    it('без cookie: 401', async () => {
      const res = await server
        .post('/api/admin/books')
        .field('title', 'Гостевая книга')
        .field('author', 'Автор')
        .field('libraryId', String(libraryId))
        .field('totalCopies', '1');

      expect(res.status).toBe(401);
    });

    it('client: 403', async () => {
      const res = await day3Client
        .post('/api/admin/books')
        .field('title', 'Клиентская книга')
        .field('author', 'Автор')
        .field('libraryId', String(libraryId))
        .field('totalCopies', '1');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/common/books: фильтры и пагинация', () => {
    it('title=пр и availableOnly=true: отфильтрованные книги с полем library', async () => {
      const res = await server
        .get('/api/common/books')
        .query({ title: 'пр', availableOnly: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      for (const book of res.body) {
        expect(book.title.toLowerCase()).toContain('пр');
        expect(book.library).toEqual({
          id: expect.any(Number),
          name: expect.any(String),
          address: expect.any(String),
        });
      }

      const titles = res.body.map((book: { title: string }) => book.title);
      expect(titles).toContain('Преступление и наказание');
      expect(titles).not.toContain('Война и мир');
    });

    it('фильтр по id библиотеки', async () => {
      const res = await server
        .get('/api/common/books')
        .query({ library: String(secondLibraryId) });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      for (const book of res.body) {
        expect(book.library.id).toBe(secondLibraryId);
      }
    });

    it('фильтр по названию библиотеки', async () => {
      const res = await server
        .get('/api/common/books')
        .query({ library: 'Дня 3' });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      for (const book of res.body) {
        expect(book.library.id).toBe(libraryId);
      }
    });

    it('фильтр по автору — частичное совпадение без учёта регистра', async () => {
      const res = await server
        .get('/api/common/books')
        .query({ author: 'ТОЛСТОЙ' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Война и мир');
    });

    it('комбинация фильтров одновременно', async () => {
      const res = await server.get('/api/common/books').query({
        library: String(libraryId),
        author: 'достоевский',
        title: 'преступление',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Преступление и наказание');
    });

    it('пустой результат: 200 и пустой массив', async () => {
      const res = await server
        .get('/api/common/books')
        .query({ title: 'книга-которой-нет-xyz' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('пагинация limit=1&offset=0 и offset=1: разные книги', async () => {
      const first = await server.get('/api/common/books?limit=1&offset=0');
      const second = await server.get('/api/common/books?limit=1&offset=1');

      expect(first.status).toBe(200);
      expect(first.body).toHaveLength(1);
      expect(second.status).toBe(200);
      expect(second.body).toHaveLength(1);
      expect(second.body[0].id).not.toBe(first.body[0].id);
    });

    it('некорректный limit: 400', async () => {
      const res = await server.get('/api/common/books?limit=abc');

      expect(res.status).toBe(400);
    });

    it('GET /api/common/books/:id: 200 с библиотекой; несуществующий: 404; «abc»: 400', async () => {
      const found = await server.get(`/api/common/books/${bookId}`);
      expect(found.status).toBe(200);
      expect(found.body.library.id).toBe(libraryId);

      const missing = await server.get('/api/common/books/999999');
      expect(missing.status).toBe(404);

      const invalid = await server.get('/api/common/books/abc');
      expect(invalid.status).toBe(400);
    });
  });

  describe('PUT /api/admin/books/:id', () => {
    it('смена totalCopies пересчитывает availableCopies: 200', async () => {
      const res = await day3Admin
        .put(`/api/admin/books/${bookId}`)
        .field('totalCopies', '5');

      expect(res.status).toBe(200);
      expect(res.body.totalCopies).toBe(5);
      expect(res.body.availableCopies).toBe(5);
      expect(res.body.isAvailable).toBe(true);
    });

    it('замена обложки удаляет старый файл', async () => {
      const oldCoverUrl = bookCoverUrl;
      const res = await day3Admin
        .put(`/api/admin/books/${bookId}`)
        .attach('coverImage', PNG, {
          filename: 'new-cover.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(200);
      expect(res.body.coverImage).not.toBe(oldCoverUrl);
      bookCoverUrl = res.body.coverImage;

      // Старого файла больше нет, новый открывается.
      await server.get(oldCoverUrl).expect(404);
      await server.get(bookCoverUrl).expect(200);
    });

    it('обновление без файла (JSON): 200', async () => {
      const res = await day3Admin
        .put(`/api/admin/books/${bookId}`)
        .send({ description: 'Новое описание книги' });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Новое описание книги');
      expect(res.body.coverImage).toBe(bookCoverUrl);
    });

    it('несуществующая библиотека в libraryId: 400', async () => {
      const res = await day3Admin
        .put(`/api/admin/books/${bookId}`)
        .field('libraryId', '999999');

      expect(res.status).toBe(400);
    });

    it('несуществующая книга: 404', async () => {
      const res = await day3Admin
        .put('/api/admin/books/999999')
        .field('title', 'Нет');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE: удаление книг и библиотек', () => {
    it('гость DELETE: 401, client DELETE: 403', async () => {
      await server.delete(`/api/admin/books/${bookId}`).expect(401);
      await day3Client.delete(`/api/admin/books/${bookId}`).expect(403);
    });

    it('удаление книги: 200, после чего книга и обложка недоступны', async () => {
      const res = await day3Admin.delete(`/api/admin/books/${bookId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      await server.get(`/api/common/books/${bookId}`).expect(404);
      await server.get(bookCoverUrl).expect(404);
    });

    it('удаление библиотеки удаляет её книги: 200, книги 404', async () => {
      const before = await server
        .get('/api/common/books')
        .query({ library: String(libraryId) });
      expect(before.body.length).toBeGreaterThanOrEqual(1);

      const res = await day3Admin.delete(`/api/admin/libraries/${libraryId}`);
      expect(res.status).toBe(200);

      const after = await server
        .get('/api/common/books')
        .query({ library: String(libraryId) });
      expect(after.body).toEqual([]);

      for (const book of before.body as Array<{ id: number }>) {
        await server.get(`/api/common/books/${book.id}`).expect(404);
      }
    });

    it('несуществующей книги: 404', async () => {
      await day3Admin.delete('/api/admin/books/999999').expect(404);
    });

    it('несуществующей библиотеки: 404', async () => {
      await day3Admin.delete('/api/admin/libraries/999999').expect(404);
    });

    it('вторая библиотека и её книга остались после удаления первой', async () => {
      const libraries = await server.get('/api/common/libraries');
      expect(libraries.body).toHaveLength(1);
      expect(libraries.body[0].id).toBe(secondLibraryId);

      const books = await server.get('/api/common/books');
      expect(books.body).toHaveLength(1);
      expect(books.body[0].title).toBe('Война и мир');
    });
  });
});
