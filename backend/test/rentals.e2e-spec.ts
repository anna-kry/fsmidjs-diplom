// Изолированная конфигурация подключается первой — до импорта AppModule
// (ConfigModule читает .env при загрузке модуля).
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

jest.setTimeout(60000);

let app: INestApplication;
let server: ReturnType<typeof request>;
let adminAgent: ReturnType<typeof request.agent>;
let managerAgent: ReturnType<typeof request.agent>;
let clientA: ReturnType<typeof request.agent>;
let clientB: ReturnType<typeof request.agent>;

// Сущности, созданные в beforeAll.
let libraryId: number;
let otherLibraryId: number;
let soloBookId: number; // totalCopies = 1
let duoBookId: number; // totalCopies = 2
let validationBookId: number; // позитивные проверки дат
let deleteBookId: number; // тесты удаления книги
let plainBookId: number; // книга без аренд
let deleteLibId: number; // тесты удаления библиотеки
let deleteLibBookId: number;

let clientAId: number;

const CLIENT_A = {
  email: 'rentals-client-a@test.local',
  password: 'Passw0rd!',
  name: 'Клиент А',
};
const CLIENT_B = {
  email: 'rentals-client-b@test.local',
  password: 'Passw0rd!',
  name: 'Клиент Б',
};

/** Локальная дата YYYY-MM-DD. */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function today(): string {
  return formatDate(new Date());
}

function plusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

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

/** Создаёт книгу через admin API и возвращает id. */
async function createBook(fields: {
  title: string;
  author?: string;
  libraryId: number;
  totalCopies: number;
}): Promise<number> {
  const res = await adminAgent
    .post('/api/admin/books')
    .field('title', fields.title)
    .field('author', fields.author ?? 'Автор Тестовый')
    .field('libraryId', String(fields.libraryId))
    .field('totalCopies', String(fields.totalCopies));

  expect(res.status).toBe(201);
  return res.body.id;
}

/** Текущие счётчики книги из публичного API. */
async function getBook(id: number): Promise<{
  availableCopies: number;
  totalCopies: number;
  isAvailable: boolean;
}> {
  const res = await server.get(`/api/common/books/${id}`);
  expect(res.status).toBe(200);
  return res.body;
}

beforeAll(async () => {
  await recreateTestDatabase();

  app = await NestFactory.create(AppModule, { logger: ['error'] });

  // Повторяет настройки src/main.ts.
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
  adminAgent = request.agent(app.getHttpServer());
  managerAgent = request.agent(app.getHttpServer());
  clientA = request.agent(app.getHttpServer());
  clientB = request.agent(app.getHttpServer());

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

  const regA = await clientA.post('/api/client/register').send(CLIENT_A);
  expect([201, 400]).toContain(regA.status);
  await clientA
    .post('/api/auth/login')
    .send({ email: CLIENT_A.email, password: CLIENT_A.password })
    .expect(200);
  const meA = await clientA.get('/api/auth/me');
  expect(meA.status).toBe(200);
  clientAId = meA.body.id;

  const regB = await clientB.post('/api/client/register').send(CLIENT_B);
  expect([201, 400]).toContain(regB.status);
  await clientB
    .post('/api/auth/login')
    .send({ email: CLIENT_B.email, password: CLIENT_B.password })
    .expect(200);

  // Каталог для тестов аренды.
  const lib = await adminAgent.post('/api/admin/libraries').send({
    name: 'Библиотека аренды',
    address: 'ул. Арендная, 1',
  });
  expect(lib.status).toBe(201);
  libraryId = lib.body.id;

  const otherLib = await adminAgent.post('/api/admin/libraries').send({
    name: 'Чужая библиотека',
    address: 'ул. Чужая, 2',
  });
  expect(otherLib.status).toBe(201);
  otherLibraryId = otherLib.body.id;

  soloBookId = await createBook({
    title: 'Книга с одним экземпляром',
    libraryId,
    totalCopies: 1,
  });
  duoBookId = await createBook({
    title: 'Книга с двумя экземплярами',
    libraryId,
    totalCopies: 2,
  });
  validationBookId = await createBook({
    title: 'Книга для проверки дат',
    libraryId,
    totalCopies: 1,
  });
  deleteBookId = await createBook({
    title: 'Книга для удаления',
    libraryId,
    totalCopies: 1,
  });
  plainBookId = await createBook({
    title: 'Книга без аренд',
    libraryId,
    totalCopies: 1,
  });

  const deleteLib = await adminAgent.post('/api/admin/libraries').send({
    name: 'Библиотека для удаления',
    address: 'ул. Сносная, 3',
  });
  expect(deleteLib.status).toBe(201);
  deleteLibId = deleteLib.body.id;
  deleteLibBookId = await createBook({
    title: 'Книга удаляемой библиотеки',
    libraryId: deleteLibId,
    totalCopies: 1,
  });
});

afterAll(async () => {
  await app?.close();
});

describe('День 4: матрица доступа 401/403', () => {
  it('гость POST /api/client/rentals: 401', async () => {
    const res = await server.post('/api/client/rentals').send({});
    expect(res.status).toBe(401);
  });

  it('гость GET /api/client/rentals: 401', async () => {
    expect((await server.get('/api/client/rentals')).status).toBe(401);
  });

  it('гость DELETE /api/client/rentals/1: 401', async () => {
    expect((await server.delete('/api/client/rentals/1')).status).toBe(401);
  });

  it('гость GET /api/manager/rentals: 401', async () => {
    expect((await server.get('/api/manager/rentals')).status).toBe(401);
  });

  it('гость PATCH /api/manager/rentals/1/status: 401', async () => {
    const res = await server
      .patch('/api/manager/rentals/1/status')
      .send({ status: 'active' });
    expect(res.status).toBe(401);
  });

  it('manager POST /api/client/rentals: 403', async () => {
    const res = await managerAgent.post('/api/client/rentals').send({});
    expect(res.status).toBe(403);
  });

  it('manager GET /api/client/rentals: 403', async () => {
    expect((await managerAgent.get('/api/client/rentals')).status).toBe(403);
  });

  it('manager DELETE /api/client/rentals/1: 403', async () => {
    expect(
      (await managerAgent.delete('/api/client/rentals/1')).status,
    ).toBe(403);
  });

  it('client GET /api/manager/rentals: 403', async () => {
    expect((await clientA.get('/api/manager/rentals')).status).toBe(403);
  });

  it('client PATCH /api/manager/rentals/1/status: 403', async () => {
    const res = await clientA
      .patch('/api/manager/rentals/1/status')
      .send({ status: 'active' });
    expect(res.status).toBe(403);
  });

  it('admin GET /api/manager/rentals: 403 (только manager)', async () => {
    expect((await adminAgent.get('/api/manager/rentals')).status).toBe(403);
  });

  it('admin POST /api/client/rentals: 403 (только client)', async () => {
    const res = await adminAgent.post('/api/client/rentals').send({});
    expect(res.status).toBe(403);
  });
});

describe('День 4: создание брони — правила дат', () => {
  it('формат даты не YYYY-MM-DD: 400', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: validationBookId,
      libraryId,
      dateStart: '10.01.2030',
      dateEnd: '15.01.2030',
    });
    expect(res.status).toBe(400);
  });

  it('дата в прошлом: 400', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: validationBookId,
      libraryId,
      dateStart: plusDays(-1),
      dateEnd: plusDays(3),
    });
    expect(res.status).toBe(400);
  });

  it('dateEnd < dateStart: 400', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: validationBookId,
      libraryId,
      dateStart: plusDays(10),
      dateEnd: plusDays(5),
    });
    expect(res.status).toBe(400);
  });

  it('срок 31 день: 400', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: validationBookId,
      libraryId,
      dateStart: today(),
      dateEnd: plusDays(31),
    });
    expect(res.status).toBe(400);
  });

  it('libraryId не совпадает с библиотекой книги: 400', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: validationBookId,
      libraryId: otherLibraryId,
      dateStart: plusDays(2),
      dateEnd: plusDays(4),
    });
    expect(res.status).toBe(400);
  });

  it('несуществующая книга: 404', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: 999999,
      libraryId,
      dateStart: plusDays(2),
      dateEnd: plusDays(4),
    });
    expect(res.status).toBe(404);
  });

  it('срок ровно 30 дней: 201', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: validationBookId,
      libraryId,
      dateStart: today(),
      dateEnd: plusDays(30),
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      userId: clientAId,
      libraryId,
      bookId: validationBookId,
      dateStart: today(),
      dateEnd: plusDays(30),
      status: 'reserved',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('дата начала сегодня: 201 (граница включительно)', async () => {
    // Отдельная книга: на validationBook уже занято [today..today+30].
    const res = await clientA.post('/api/client/rentals').send({
      bookId: soloBookId,
      libraryId,
      dateStart: today(),
      dateEnd: today(),
    });
    expect(res.status).toBe(201);
  });
});

describe('День 4: бронирование одной книги (totalCopies=1)', () => {
  let firstRentalId: number;
  let secondRentalId: number;

  it('первая бронь: 201, статус reserved', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: soloBookId,
      libraryId,
      dateStart: plusDays(10),
      dateEnd: plusDays(15),
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('reserved');
    expect(res.body.bookId).toBe(soloBookId);
    firstRentalId = res.body.id;
  });

  it('вторая бронь на пересекающиеся даты: 409', async () => {
    const res = await clientB.post('/api/client/rentals').send({
      bookId: soloBookId,
      libraryId,
      dateStart: plusDays(12),
      dateEnd: plusDays(18),
    });
    expect(res.status).toBe(409);
  });

  it('границы периодов включительно: начало в день окончания первой — 409', async () => {
    const res = await clientB.post('/api/client/rentals').send({
      bookId: soloBookId,
      libraryId,
      dateStart: plusDays(15),
      dateEnd: plusDays(20),
    });
    expect(res.status).toBe(409);
  });

  it('непересекающиеся даты (со следующего дня): 201', async () => {
    const res = await clientB.post('/api/client/rentals').send({
      bookId: soloBookId,
      libraryId,
      dateStart: plusDays(16),
      dateEnd: plusDays(20),
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('reserved');
    secondRentalId = res.body.id;
  });

  it('GET /api/client/rentals: только свои аренды с book и library', async () => {
    const res = await clientA.get('/api/client/rentals');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const ids = res.body.map((r: { id: number }) => r.id);
    expect(ids).toContain(firstRentalId);
    // Чужая бронь не видна.
    expect(ids).not.toContain(secondRentalId);

    const rental = res.body.find((r: { id: number }) => r.id === firstRentalId);
    expect(rental).toMatchObject({
      userId: clientAId,
      status: 'reserved',
      book: { id: soloBookId, title: expect.any(String), author: expect.any(String) },
      library: { id: libraryId, name: expect.any(String) },
    });
    // Пользователь в клиентском ответе не раскрывается.
    expect(rental.user).toBeUndefined();
  });

  it('фильтр ?status= возвращает только этот статус', async () => {
    const res = await clientB.get('/api/client/rentals?status=reserved');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const rental of res.body) {
      expect(rental.status).toBe('reserved');
    }
  });

  it('невалидный статус в фильтре: 400', async () => {
    const res = await clientA.get('/api/client/rentals?status=bogus');
    expect(res.status).toBe(400);
  });

  it('список отсортирован по убыванию id (новые сверху)', async () => {
    const res = await clientA.get('/api/client/rentals');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(1);

    const ids = res.body.map((r: { id: number }) => r.id);
    const sorted = [...ids].sort((a, b) => b - a);
    expect(ids).toEqual(sorted);
  });

  it('пагинация limit=1', async () => {
    const res = await clientA.get('/api/client/rentals?limit=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('День 4: отмена брони клиентом', () => {
  let victimRentalId: number; // бронь клиента Б для проверки 403

  it('подготавливает бронь для проверки чужой отмены', async () => {
    const res = await clientB.post('/api/client/rentals').send({
      bookId: deleteBookId,
      libraryId,
      dateStart: plusDays(40),
      dateEnd: plusDays(45),
    });
    expect(res.status).toBe(201);
    victimRentalId = res.body.id;
  });

  it('клиент А отменяет чужую бронь: 403', async () => {
    const res = await clientA.delete(`/api/client/rentals/${victimRentalId}`);
    expect(res.status).toBe(403);
  });

  it('несуществующая бронь: 404', async () => {
    const res = await clientA.delete('/api/client/rentals/999999');
    expect(res.status).toBe(404);
  });

  it('своя бронь reserved → cancelled: 200', async () => {
    // Отменяем бронь, созданную на предыдущем шаге (своя у клиента Б).
    const res = await clientB.delete(`/api/client/rentals/${victimRentalId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: victimRentalId,
      status: 'cancelled',
      bookId: deleteBookId,
    });
  });

  it('повторная отмена (статус уже cancelled): 400', async () => {
    const res = await clientB.delete(`/api/client/rentals/${victimRentalId}`);
    expect(res.status).toBe(400);
  });

  it('после отмены даты снова свободны: 201 на тех же датах', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: deleteBookId,
      libraryId,
      dateStart: plusDays(40),
      dateEnd: plusDays(45),
    });
    expect(res.status).toBe(201);
    // Убираем бронь, чтобы не мешала тестам удаления ниже.
    const cancel = await clientA.delete(
      `/api/client/rentals/${res.body.id as number}`,
    );
    expect(cancel.status).toBe(200);
  });
});

describe('День 4: параллельное бронирование последнего экземпляра', () => {
  it('два параллельных запроса: ровно один 201, второй 409', async () => {
    const payload = {
      bookId: soloBookId,
      libraryId,
      dateStart: plusDays(50),
      dateEnd: plusDays(55),
    };

    const [first, second] = await Promise.all([
      clientA.post('/api/client/rentals').send(payload),
      clientB.post('/api/client/rentals').send(payload),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);

    // Успешной может быть только одна бронь.
    const list = await managerAgent.get(
      `/api/manager/rentals?libraryId=${libraryId}&status=reserved&limit=100`,
    );
    expect(list.status).toBe(200);
    const overlapping = list.body.filter(
      (r: { bookId: number; dateStart: string }) =>
        r.bookId === soloBookId && r.dateStart === plusDays(50),
    );
    expect(overlapping).toHaveLength(1);
  });
});

describe('День 4: смена статуса менеджером и счётчики', () => {
  let r1: number; // active → completed
  let r2: number; // active → completed
  let r3: number; // reserved, недопустимый переход
  let r4: number; // active → cancelled

  it('резервирование не меняет availableCopies: 2 из 2', async () => {
    const res = await clientA.post('/api/client/rentals').send({
      bookId: duoBookId,
      libraryId,
      dateStart: plusDays(10),
      dateEnd: plusDays(15),
    });
    expect(res.status).toBe(201);
    r1 = res.body.id;

    const book = await getBook(duoBookId);
    expect(book.availableCopies).toBe(2);
    expect(book.isAvailable).toBe(true);
  });

  it('второе резервирование непересекающихся дат: 201', async () => {
    const res = await clientB.post('/api/client/rentals').send({
      bookId: duoBookId,
      libraryId,
      dateStart: plusDays(20),
      dateEnd: plusDays(25),
    });
    expect(res.status).toBe(201);
    r2 = res.body.id;
  });

  it('reserved → active: 200, availableCopies уменьшается', async () => {
    const res = await managerAgent
      .patch(`/api/manager/rentals/${r1}/status`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');

    const book = await getBook(duoBookId);
    expect(book.availableCopies).toBe(1);
    expect(book.isAvailable).toBe(true);
  });

  it('вторая reserved → active: 201→200, availableCopies=0, isAvailable=false', async () => {
    const res = await managerAgent
      .patch(`/api/manager/rentals/${r2}/status`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    const book = await getBook(duoBookId);
    expect(book.availableCopies).toBe(0);
    expect(book.isAvailable).toBe(false);
  });

  it('active → active (тот же статус): 400', async () => {
    const res = await managerAgent
      .patch(`/api/manager/rentals/${r2}/status`)
      .send({ status: 'active' });
    expect(res.status).toBe(400);
  });

  it('active → completed: 200, availableCopies увеличивается', async () => {
    const res = await managerAgent
      .patch(`/api/manager/rentals/${r2}/status`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');

    const book = await getBook(duoBookId);
    expect(book.availableCopies).toBe(1);
    expect(book.isAvailable).toBe(true);
  });

  it('completed → active: 400 (недопустимый переход)', async () => {
    const res = await managerAgent
      .patch(`/api/manager/rentals/${r2}/status`)
      .send({ status: 'active' });
    expect(res.status).toBe(400);
  });

  it('reserved → completed: 400', async () => {
    const created = await clientB.post('/api/client/rentals').send({
      bookId: duoBookId,
      libraryId,
      dateStart: plusDays(30),
      dateEnd: plusDays(33),
    });
    expect(created.status).toBe(201);
    r3 = created.body.id;

    const res = await managerAgent
      .patch(`/api/manager/rentals/${r3}/status`)
      .send({ status: 'completed' });
    expect(res.status).toBe(400);
  });

  it('status=reserved в теле: 400 (валидация DTO)', async () => {
    const res = await managerAgent
      .patch(`/api/manager/rentals/${r3}/status`)
      .send({ status: 'reserved' });
    expect(res.status).toBe(400);
  });

  it('reserved → cancelled менеджером: 200, счётчики не меняются', async () => {
    const before = await getBook(duoBookId);
    const res = await managerAgent
      .patch(`/api/manager/rentals/${r3}/status`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');

    const after = await getBook(duoBookId);
    expect(after.availableCopies).toBe(before.availableCopies);
  });

  it('active → cancelled: 200, availableCopies возвращается', async () => {
    const created = await clientA.post('/api/client/rentals').send({
      bookId: duoBookId,
      libraryId,
      dateStart: plusDays(35),
      dateEnd: plusDays(38),
    });
    expect(created.status).toBe(201);
    r4 = created.body.id;

    // До активации r1 уже занимает один экземпляр — на полке 1 из 2.
    const before = await getBook(duoBookId);
    expect(before.availableCopies).toBe(1);

    await managerAgent
      .patch(`/api/manager/rentals/${r4}/status`)
      .send({ status: 'active' })
      .expect(200);

    const taken = await getBook(duoBookId);
    expect(taken.availableCopies).toBe(0);
    expect(taken.isAvailable).toBe(false);

    const res = await managerAgent
      .patch(`/api/manager/rentals/${r4}/status`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);

    const back = await getBook(duoBookId);
    expect(back.availableCopies).toBe(1);
    expect(back.isAvailable).toBe(true);
  });

  it('переход последней active-брони завершает цикл: availableCopies=2', async () => {
    await managerAgent
      .patch(`/api/manager/rentals/${r1}/status`)
      .send({ status: 'completed' })
      .expect(200);

    const book = await getBook(duoBookId);
    expect(book.availableCopies).toBe(2);
    expect(book.isAvailable).toBe(true);
  });

  it('аренда не найдена: 404', async () => {
    const res = await managerAgent
      .patch('/api/manager/rentals/999999/status')
      .send({ status: 'active' });
    expect(res.status).toBe(404);
  });
});

describe('День 4: список аренд менеджера', () => {
  it('GET /api/manager/rentals: 200, аренда с user, book и library', async () => {
    const res = await managerAgent.get('/api/manager/rentals');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const rental = res.body[0];
    expect(rental).toMatchObject({
      user: { id: expect.any(Number), name: expect.any(String), email: expect.any(String) },
      book: { id: expect.any(Number), title: expect.any(String), author: expect.any(String) },
      library: { id: expect.any(Number), name: expect.any(String) },
    });
    expect(JSON.stringify(rental)).not.toContain('passwordHash');
  });

  it('фильтр ?userId=', async () => {
    const res = await managerAgent.get(
      `/api/manager/rentals?userId=${clientAId}&limit=100`,
    );

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const rental of res.body) {
      expect(rental.userId).toBe(clientAId);
    }
  });

  it('фильтр ?libraryId=', async () => {
    const res = await managerAgent.get(
      `/api/manager/rentals?libraryId=${libraryId}&limit=100`,
    );

    expect(res.status).toBe(200);
    for (const rental of res.body) {
      expect(rental.libraryId).toBe(libraryId);
      expect(rental.library.id).toBe(libraryId);
    }
  });

  it('фильтр ?status=', async () => {
    const res = await managerAgent.get(
      '/api/manager/rentals?status=cancelled&limit=100',
    );

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const rental of res.body) {
      expect(rental.status).toBe('cancelled');
    }
  });

  it('невалидный статус: 400; невалидный userId: 400', async () => {
    expect(
      (await managerAgent.get('/api/manager/rentals?status=bogus')).status,
    ).toBe(400);
    expect(
      (await managerAgent.get('/api/manager/rentals?userId=abc')).status,
    ).toBe(400);
  });
});

describe('День 4: удаление книги и библиотеки при активных арендам', () => {
  let bookRentalId: number;
  let libRentalId: number;

  it('удаление книги с бронью reserved: 409', async () => {
    const created = await clientA.post('/api/client/rentals').send({
      bookId: deleteBookId,
      libraryId,
      dateStart: plusDays(60),
      dateEnd: plusDays(65),
    });
    expect(created.status).toBe(201);
    bookRentalId = created.body.id;

    const res = await adminAgent.delete(
      `/api/admin/books/${deleteBookId}`,
    );
    expect(res.status).toBe(409);
  });

  it('удаление книги с арендой active: 409', async () => {
    await managerAgent
      .patch(`/api/manager/rentals/${bookRentalId}/status`)
      .send({ status: 'active' })
      .expect(200);

    const res = await adminAgent.delete(`/api/admin/books/${deleteBookId}`);
    expect(res.status).toBe(409);
  });

  it('после cancelled удаление книги проходит: 200, история аренд удаляется каскадом', async () => {
    await managerAgent
      .patch(`/api/manager/rentals/${bookRentalId}/status`)
      .send({ status: 'cancelled' })
      .expect(200);

    const res = await adminAgent.delete(`/api/admin/books/${deleteBookId}`);
    expect(res.status).toBe(200);

    const gone = await server.get(`/api/common/books/${deleteBookId}`);
    expect(gone.status).toBe(404);

    // Аренды удалённой книги больше не видны в списках.
    const list = await clientA.get('/api/client/rentals?limit=100');
    expect(list.status).toBe(200);
    const ids = list.body.map((r: { bookId: number }) => r.bookId);
    expect(ids).not.toContain(deleteBookId);
  });

  it('удаление книги без аренд сохраняет прежнее поведение: 200', async () => {
    const res = await adminAgent.delete(`/api/admin/books/${plainBookId}`);
    expect(res.status).toBe(200);
    expect((await server.get(`/api/common/books/${plainBookId}`)).status).toBe(
      404,
    );
  });

  it('удаление библиотеки с арендой по её книге: 409', async () => {
    const created = await clientB.post('/api/client/rentals').send({
      bookId: deleteLibBookId,
      libraryId: deleteLibId,
      dateStart: plusDays(70),
      dateEnd: plusDays(75),
    });
    expect(created.status).toBe(201);
    libRentalId = created.body.id;

    const res = await adminAgent.delete(`/api/admin/libraries/${deleteLibId}`);
    expect(res.status).toBe(409);
  });

  it('после отмены брони библиотека удаляется каскадно: 200', async () => {
    await clientB
      .delete(`/api/client/rentals/${libRentalId}`)
      .expect(200);

    const res = await adminAgent.delete(
      `/api/admin/libraries/${deleteLibId}`,
    );
    expect(res.status).toBe(200);

    // Книга библиотеки удалена каскадно, её брони тоже.
    expect(
      (await server.get(`/api/common/books/${deleteLibBookId}`)).status,
    ).toBe(404);
    const list = await managerAgent.get('/api/manager/rentals?limit=100');
    expect(list.status).toBe(200);
    const bookIds = list.body.map((r: { bookId: number }) => r.bookId);
    expect(bookIds).not.toContain(deleteLibBookId);
  });
});
