# Отчёт: День 1 — этап 1 (backend-фундамент)

Дата: 2026-11-12

## Что реализовано

| Файл                                      | Действие                         | Содержание                                                                                                                                                |
| ----------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/main.ts`                     | Перезаписан                      | NestJS bootstrap: `setGlobalPrefix('/api')`, `helmet()`, глобальный `ValidationPipe({whitelist, forbidNonWhitelisted, transform})`, `app.listen()`        |
| `backend/src/app.module.ts`               | Перезаписан                      | `ConfigModule.forRoot()` (global, с `envFilePath: '.env'`, `load: [configuration]`, `validate: validateConfig`), импорты `DatabaseModule`, `HealthModule` |
| `backend/src/config/env.validation.ts`    | Создан                           | Проверка всех обязательных env-переменных при старте; выбрасывает `Error` с перечислением отсутствующих                                                   |
| `backend/src/config/configuration.ts`     | Создан                           | Фабрика конфига через `registerAs('app', …)`: http, postgres, session, db, uploads, seed                                                                  |
| `backend/src/database/database.module.ts` | Создан                           | `TypeOrmModule.forRootAsync()` с PostgreSQL, `synchronize` из `DB_SYNCHRONIZE`, `autoLoadEntities: true`, экспортирует `TypeOrmModule`                    |
| `backend/src/health/health.controller.ts` | Создан                           | `GET /health` → `{ status: 'ok' }`                                                                                                                        |
| `backend/src/health/health.module.ts`     | Создан                           | Модуль с `HealthController`                                                                                                                               |
| `.env`                                    | Создан (локально, не коммитится) | Значения для локального запуска; в `.gitignore`                                                                                                           |

## Проверки

1. **Lint** (`npm run lint --workspace=backend`) — пройден, ошибок нет.
2. **Build** (`npm run build --workspace=backend`) — пройден, `dist/` собран.
   - Проблема: `tsconfig.build.tsbuildinfo` вызывал инкрементальное пропускание компиляции — пришлось удалить кеш.
   - Проблема: `import { helmet } from 'helmet'` → исправлено на `import helmet from 'helmet'` (helmet v8 default export).
3. **Runtime** — бэкенд запущен (`node backend/dist/main.js`), лог подтверждает:
   - `DatabaseModule`, `TypeOrmModule`, `ConfigModule` инициализированы без ошибок.
   - Маршрут `HealthController {/api/health}, GET` зарегистрирован.
4. **HTTP-запрос** `curl -i http://localhost:3000/api/health`:
   - `HTTP/1.1 200 OK`
   - Тело: `{"status":"ok"}`
   - Helmet-заголовки присутствуют (CSP, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` и т.д.).
5. **Docker** — `docker compose config` валиден, сервисы `app` и `db` корректно сконфигурированы, порты и volumes отображаются верно.

## Список изменённых файлов

```
 M backend/src/app.module.ts
 M backend/src/config/configuration.ts
 M backend/src/config/env.validation.ts
 M backend/src/database/database.module.ts
 M backend/src/main.ts
 M backend/tsconfig.build.tsbuildinfo
?? backend/src/health/health.controller.ts
?? backend/src/health/health.module.ts
```

## Как проверить самостоятельно

```bash
# 1. Убедиться, что .env существует (уже создан, не коммитится)
cat .env

# 2. Запустить сборку
npm run build --workspace=backend

# 3. Запустить бэкенд
node backend/dist/main.js

# 4. В другом терминале проверить эндпоинт
curl -i http://localhost:3000/api/health
# Ожидается: HTTP/1.1 200 OK, {"status":"ok"}

# 5. Проверить валидацию env — временно удалить переменную из .env и перезапустить,
# приложение должно упасть с ошибкой "Missing required environment variables: ..."
```

## Невыполненные требования Дня 1 (переходят на следующий этап)

- `UsersModule`: сущность `User`, `IUserService` + `UsersService` (create, findById, findByEmail, findAll с `ILIKE`), `PasswordService` (bcrypt) — **не реализовано**.
- `SeedService`: создание `admin` и `manager` из `SEED_*` — **не реализовано**.
- Unit-тесты `UsersService` (`backend/src/users/users.service.spec.ts` — пустой) — **не написаны**.
- Остальные эндпоинты (auth, users, libraries, rentals, support) — **не реализованы**.
- Frontend (Vite + React, store, роутер, страницы) — **не начат**.
- Git-коммит и тег `day-1` — **не сделаны**.

## Обнаруженные проблемы

1. `tsconfig.build.tsbuildinfo` мешал `tsc` перекомпилировать после изменений — пришлось удалять файл вручную перед сборкой.
2. `nest build` не выдавал ошибок, но не создавал `dist/` из-за инкрементального кеширования — прямая компиляция через `tsc -p tsconfig.build.json` сработала.
3. В `backend/package.json` скрипт `seed:demo` содержит заглушку `nest start --watch` — потребуется доработка при реализации сидирования.
4. Для локального запуска вне Docker потребовалось вручную создать роль `postgres` и БД `library_booking` в PostgreSQL (в Docker контейнер создаст их автоматически).

# Отчёт: День 1, этапы 1–2

**Дата:** 12 ноября 2026

## 1. Что реализовано

### Backend-фундамент

- Настроен NestJS bootstrap в `backend/src/main.ts`.
- Добавлен глобальный префикс `/api`.
- Подключён Helmet.
- Настроен глобальный `ValidationPipe`.
- Добавлен `ConfigModule` с валидацией переменных окружения.
- Создан `DatabaseModule` с подключением TypeORM к PostgreSQL.
- Добавлен `GET /api/health`, возвращающий `{ "status": "ok" }`.
- Создан локальный `.env`, исключённый из Git.

### Common

- `common/types/id.type.ts` — тип `ID = number`, единый тип идентификаторов согласно спецификации (§2.2).
- `common/utils/escape-like.ts` — функция `escapeLike()`, экранирующая символы `\`, `%` и `_` в пользовательском вводе для поиска через ILIKE.
- `common/dto/pagination-query.dto.ts` — `PaginationQueryDto`: параметры `offset` (по умолчанию 0) и `limit` (от 1 до 100, по умолчанию 20), валидация через class-validator и class-transformer (§2.18).

### UsersModule

- `users/entities/user.entity.ts` — сущность `User`, соответствующая таблице `users`:
  - `id`;
  - `email` (unique);
  - `passwordHash`;
  - `name`;
  - `contactPhone`;
  - `role` (enum, по умолчанию `client`);
  - `createdAt`;
  - `updatedAt`.

- `users/interfaces/user-service.interface.ts` — интерфейсы `IUserService` и `SearchUserParams`, описывающие контракт сервиса и параметры поиска.

- `users/password.service.ts` — `PasswordService`:
  - `hash()` — хеширование пароля через bcrypt с 10 раундами;
  - `compare()` — проверка пароля при входе (§8).

- `users/users.service.ts` — `UsersService`:
  - `create`;
  - `findById`;
  - `findByEmail`;
  - `findAll` — поиск по email, name и contactPhone через ILIKE с экранированием и пагинацией через `skip/take`.

- `users/users.module.ts` — регистрирует репозиторий `User` через `TypeOrmModule.forFeature()`, экспортирует `UsersService` и `PasswordService`.

### SeedService

- `database/seed.service.ts` — `SeedService` реализует `OnModuleInit` и создаёт пользователей `admin` и `manager` при запуске приложения.
- Данные берутся из переменных `SEED_*`.
- Если пользователь с таким email уже существует, создание пропускается.
- Пароли сохраняются только в виде bcrypt-хешей.

- `database/database.module.ts` — подключает `UsersModule` и предоставляет `SeedService`.

## 2. Как связаны модули

```text
AppModule
└── DatabaseModule
    ├── TypeOrmModule.forRootAsync()
    │   └── Подключение к PostgreSQL
    │
    ├── UsersModule
    │   └── TypeOrmModule.forFeature([User])
    │       └── Repository<User>
    │
    └── SeedService
        ├── UsersService
        │   └── Поиск и создание пользователей
        │
        ├── PasswordService
        │   └── Хеширование паролей
        │
        └── ConfigService
            └── Чтение SEED_* настроек

UsersModule
├── UsersService
├── PasswordService
└── Repository<User>
```

### Порядок работы при запуске

1. `ConfigModule` загружает и проверяет `.env`.
2. TypeORM подключается к PostgreSQL.
3. При `DB_SYNCHRONIZE=true` TypeORM синхронизирует структуру таблиц.
4. `SeedService.onModuleInit()` создаёт начальных пользователей.
5. Для каждого пользователя выполняется поиск по email:
   - если пользователь найден, создание пропускается;
   - если не найден, пароль хешируется через `PasswordService.hash()`, затем вызывается `UsersService.create()`.

Порядок инициализации проверен по исходникам NestJS и TypeORM: SeedService запускается после инициализации подключения к БД.

## 3. Назначение каждого класса и файла

| Файл                                         | Назначение                                             |
| -------------------------------------------- | ------------------------------------------------------ |
| `common/types/id.type.ts`                    | Тип `ID = number`                                      |
| `common/utils/escape-like.ts`                | Экранирование специальных символов в поисковом запросе |
| `common/dto/pagination-query.dto.ts`         | Валидация параметров пагинации                         |
| `users/entities/user.entity.ts`              | Описание таблицы `users`                               |
| `users/interfaces/user-service.interface.ts` | Контракт `IUserService` и параметры поиска             |
| `users/password.service.ts`                  | Хеширование и проверка паролей                         |
| `users/users.service.ts`                     | Создание, поиск и получение пользователей              |
| `users/users.module.ts`                      | Регистрация репозитория и экспорт сервисов             |
| `database/seed.service.ts`                   | Создание начальных пользователей                       |
| `database/database.module.ts`                | Подключение UsersModule и предоставление SeedService   |

## 4. Результаты проверок

| Проверка         | Команда                             | Результат                               |
| ---------------- | ----------------------------------- | --------------------------------------- |
| Lint             | `npm run lint --workspace=backend`  | Успешно, ошибок нет                     |
| Build            | `npm run build --workspace=backend` | Успешно, `backend/dist/main.js` создан  |
| Повторная сборка | `npm run build --workspace=backend` | Успешно, повторная сборка тоже работает |
| Unit-тесты       | `npm test --workspace=backend`      | Успешно: 1 suite, 16 тестов пройдены    |

### Состав тестов

Все 16 тестов прошли без подключения к PostgreSQL. Используются моки репозитория.

- 2 теста `PasswordService`;
- 2 теста `escapeLike`;
- 3 теста создания пользователя;
- 2 теста `findById`;
- 2 теста `findByEmail`;
- 5 тестов `findAll`.

## 5. Запуск приложения и Health endpoint

При проверке обнаружилась проблема с занятым портом.

1. Первый запуск новой сборки завершился с `EADDRINUSE`: порт 3000 занимал процесс от предыдущего запуска (PID 34621).
2. Первый `curl` вернул HTTP 200 от старого процесса. Эта проверка была недостоверной для новой сборки.
3. Старый процесс был остановлен, приложение перезапущено из свежей сборки.
4. В логе появилось сообщение `Nest application successfully started`, ошибок запуска не было.
5. Выполнен запрос:

   ```bash
   curl -i http://localhost:3000/api/health
   ```

   Результат: `HTTP/1.1 200 OK`, тело ответа:

   ```json
   {
     "status": "ok"
   }
   ```

6. При первом запуске SeedService создал:
   - `admin@example.com`;
   - `manager@example.com`.

7. Проверка PostgreSQL:

   ```sql
   SELECT ... FROM users;
   ```

   Результат:
   - 2 записи;
   - роли `admin` и `manager`;
   - значения `passwordHash` начинаются с `$2b$10$` и имеют длину 60 символов;
   - открытых паролей в таблице нет.

8. Приложение было перезапущено повторно. Новые записи не создались, счётчик остался равен 2. Health endpoint снова вернул HTTP 200.
9. Приложение остановлено, порт освобождён.

## 6. Выполненные требования Дня 1

- [x] `common/`: тип ID, `escape-like.ts`, `pagination-query.dto.ts`.
- [x] `UsersModule`: User, IUserService, UsersService с методами create, findById, findByEmail, findAll.
- [x] Поиск через ILIKE с экранированием и пагинацией.
- [x] PasswordService с bcrypt (10 раундов).
- [x] Экспорт необходимых сервисов из UsersModule.
- [x] SeedService: создание admin и manager из `SEED_*`, без дубликатов.
- [x] Пароли сохраняются только в виде хешей.
- [x] GET `/api/health` возвращает HTTP 200.
- [x] Backend lint и build проходят.
- [x] Unit-тесты UsersService написаны и проходят.
- [x] `Dockerfile`, `docker-compose.yaml`, `.env-example`, `AGENTS.md` уже существуют.

## 7. Что осталось для завершения Дня 1

1. **Frontend-фундамент:**
   - Vite + React + TypeScript в `frontend/`;
   - Bootstrap 5 и react-bootstrap;
   - `store.ts`;
   - типизированные хуки;
   - `router.tsx`;
   - `Layout` и `Navbar` с гостевыми ссылками;
   - заглушки страниц;
   - `api/http.ts`;
   - `types/index.ts`.

2. **Vite proxy:** настроить проксирование `/api`, `/uploads`, `/socket.io`.

3. **Раздача frontend через NestJS:** подключить `@nestjs/serve-static` для `frontend/dist` с исключениями `/api`, `/uploads`, `/socket.io` и SPA fallback.

4. **Docker:** проверить фактический запуск `docker compose up --build`, работу сервисов `app` и `db`.

5. **Git:** создать коммиты по логическим этапам и тег `day-1`. Коммиты и тег создаются вручную.

## 8. Решения, принятые самостоятельно

1. **Исправление сборки.** `nest build` с `deleteOutDir: true` удалял `dist`, но `tsbuildinfo` заставлял компилятор считать, что сборка уже выполнена. В `tsconfig.build.json` добавлено `"incremental": false`, чтобы сборка выполнялась заново. Настройки разработки не затронуты.

2. **Удаление закоммиченного кеша.** `backend/tsconfig.build.tsbuildinfo` был удалён из репозитория. Его не следует включать в коммиты. В `.gitignore` отдельное правило для `*.tsbuildinfo` пока не добавлялось.

3. **Типы Jest.** TypeScript 6.0.3 не подхватывал `@types/jest` автоматически. В `tsconfig.json` добавлены `"types": ["node", "jest"]`.

4. **Пустые тестовые файлы.** Удалены три пустых spec-файла (`books`, `rentals`, `support`), которые вызывали ошибку Jest `Your test suite must contain at least one test`. Тесты этих модулей будут добавлены в соответствующие дни согласно спецификации. `test/app.e2e-spec.ts` оставлен пустым: он не входит в текущий запуск unit-тестов и будет наполнен на Дне 2.

5. **Отсутствие пользователя.** `findById` и `findByEmail` возвращают `null`, если запись не найдена. Это естественное поведение TypeORM. Обработку отсутствующего пользователя и HTTP 404 предполагается выполнять в контроллерах Дня 2.

6. **Нормализация email.** В `UsersService.create` и `findByEmail` используется приведение email к нижнему регистру. Спецификация требует хранить email в lower-case, но не указывает, где именно его нормализовать.

7. **Имена сидируемых пользователей.** В `SEED_*` передаются email и пароль, а поле `name` обязательно. Использованы значения «Администратор» и «Менеджер» (текст интерфейса на русском языке).

8. **Хук сидирования.** Использован `OnModuleInit`. Проверено, что к этому моменту подключение к БД уже готово.

9. **PasswordService.compare.** Метод добавлен заранее. Сейчас он используется в тестах, но потребуется для реализации авторизации в День 2.

## 9. Примечания

- `backend/tsconfig.build.tsbuildinfo` помечен на удаление из Git. Это намеренное изменение.
- Необходимо убедиться, что `.env` не отслеживается Git и не попадёт в следующий коммит.
- Для локального запуска используется PostgreSQL, установленный через Homebrew. Ранее для него вручную создавались роль `postgres` и база `library_booking`.
- Фактический запуск Docker-контейнеров пока не подтверждён. `docker compose config` проверяет корректность конфигурации, но не доказывает, что контейнеры запускаются.
