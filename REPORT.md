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

---

# Отчёт: День 2 — frontend (авторизация, маршрутизация, управление пользователями)

Дата: 2026-11-16

Backend Дня 2 был реализован и проверен ранее; в рамках этой задачи Backend не изменялся. Ниже — только Frontend.

## 1. Реализованные возможности

### Авторизация (Redux `auth`)

- Срез `features/auth/authSlice.ts` с thunks `login`, `register`, `logout`, `fetchMe` (`createSlice` + `createAsyncThunk`).
- Состояние: `user | null`, `loading`, `error`, `initialized` (первичная проверка сессии завершена).
- На старте приложения `App.tsx` диспатчит `fetchMe` (`GET /api/auth/me`): до его завершения показывается полноэкранный loader — защищённые страницы и редиректы не выполняются, ложных редиректов нет.
- 401 от `/auth/me` трактуется как «гость», а не ошибка; прочие ошибки сохраняются в `error`, но `initialized` всё равно становится `true`.
- Сессия — только серверная cookie: пароль, cookie и сессионные данные в Redux Persist/localStorage/sessionStorage не сохраняются (Redux Persist не подключается).
- Использован существующий Axios-инстанс `api/http.ts` (`baseURL: '/api'`, `withCredentials: true`).

### Страницы входа и регистрации

- `LoginPage`: поля email/пароль, клиентская валидация, ошибка 401 → «Неверный email или пароль», состояния loading/disabled у кнопки, после входа переход на `location.state.from` (куда гость пытался попасть) или на `/`. Уже авторизованному пользователю страница не показывается (`GuestRoute`).
- `RegisterPage`: поля email/пароль/имя/контактный телефон, валидация по правилам Backend DTO (email, пароль ≥ 8, имя 1..100, допустимые символы телефона `+0-9 ()-`), ошибка 400 (в т.ч. занятый email) показывается текстом ответа сервера. После успеха — переход на `/login` с сообщением об успешной регистрации; автоматический вход не выполняется (Backend его не выполняет).

### Маршрутизация и защита

- `GuestRoute` — только для гостей (`/login`, `/register`).
- `ProtectedRoute` — только для авторизованных, с запоминанием `from` для возврата после входа.
- `RoleRoute` — проверка роли (`roles: UserRole[]`): гость → `/login` (с `from`), недостаточно прав → редирект на `/`, чужая страница не отображается.
- `NotFoundPage` — 404 + ссылка «На главную».
- Все существующие маршруты сохранены, обёрнуты в guard-компоненты: `/my/rentals` и `/support` — client; `/admin/*` — admin; `/manager/*` — manager.
- При ответе 401 от защищённого эндпоинта срез `users` диспатчит `auth/sessionExpired`, и guard-и сами перенаправляют на `/login`.

### Navbar

- Гость: «Книги», «Вход», «Регистрация».
- client: «Книги», «Мои брони», «Поддержка», имя пользователя, «Выход».
- manager: «Книги», «Пользователи», «Брони», «Обращения», имя, «Выход».
- admin: «Книги», «Библиотеки», «Книги (упр.)», «Пользователи», имя, «Выход».
- Logout: запрос `POST /api/auth/logout`, очистка `user` в Redux, возврат на публичную страницу `/`, меню гостя. После перезагрузки сессия восстанавливается через `fetchMe`.

### AdminUsersPage (`/admin/users`, только admin)

- Список через `GET /api/admin/users` в таблице (ID, email, имя, телефон).
- Фильтры по email, имени и контактному телефону (применение по кнопке «Найти», «Сбросить») — query-параметры `email`, `name`, `contactPhone`.
- Пагинация «Назад/Вперёд» (`limit`/`offset`, страница по 20).
- Форма создания через `POST /api/admin/users`: email, пароль, имя, телефон, роль (client/manager/admin — как в Backend), клиентская валидация, disabled-состояние кнопки, ошибка 400 от сервера, очистка формы и обновление списка после создания.
- Состояния: loading-индикатор, `ErrorAlert` с ошибкой API, сообщение о пустом результате поиска.

### ManagerUsersPage (`/manager/users`, только manager)

- Список через `GET /api/manager/users`, те же фильтры и пагинация.
- Интерфейса создания/редактирования нет.

### Общие компоненты

- `Loader` (inline и fullPage), `ErrorAlert`, `Pagination` («Назад/Вперёд», т.к. API не возвращает общее число записей).
- `UsersFilters`, `UsersTable`, `CreateUserForm` — используются страницами admin и manager без дублирования кода.

## 2. Созданные и изменённые файлы

### Созданы / наполнены (ранее были пустыми заглушками)

| Файл                                     | Описание                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `frontend/src/api/error.ts`              | `getApiErrorMessage()`: извлекает русское сообщение из ответа Nest, заменяет `Unauthorized`/`Forbidden` |
| `frontend/src/api/auth.api.ts`           | Вызовы `login`, `register`, `logout`, `me`                                                     |
| `frontend/src/api/users.api.ts`          | Вызовы `fetchAdminUsers`, `fetchManagerUsers`, `createAdminUser` + `UserListParams`            |
| `frontend/src/features/auth/authSlice.ts`| Срез авторизации (thunks `login/register/logout/fetchMe`, `clearError`, `sessionExpired`)      |
| `frontend/src/features/users/usersSlice.ts` | Срез списков пользователей (thunks `fetchUsers`, `createAdminUser`)                         |
| `frontend/src/components/common/Loader.tsx`     | Индикатор загрузки                                                                     |
| `frontend/src/components/common/ErrorAlert.tsx` | `Alert` для ошибок API                                                                 |
| `frontend/src/components/common/Pagination.tsx` | Пагинация «Назад/Вперёд»                                                               |
| `frontend/src/components/guards/GuestRoute.tsx`     | Доступ только для гостя                                                           |
| `frontend/src/components/guards/ProtectedRoute.tsx` | Доступ только для авторизованных                                                 |
| `frontend/src/components/guards/RoleRoute.tsx`      | Доступ с проверкой роли                                                         |
| `frontend/src/components/users/UsersFilters.tsx`    | Форма фильтров email/имя/телефон                                              |
| `frontend/src/components/users/UsersTable.tsx`      | Таблица пользователей + пустое состояние                                     |
| `frontend/src/components/users/CreateUserForm.tsx`  | Форма создания пользователя (admin)                                          |

### Изменены

| Файл                                   | Изменение                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `frontend/src/types/index.ts`          | Добавлены `UserListItem`, `UserFilters`, `CreateUserInput`; `User.contactPhone` теперь `string \| null` (сервер возвращает `null`) |
| `frontend/src/app/store.ts`            | Подключены редьюсеры `auth` и `users`                                                                        |
| `frontend/src/App.tsx`                 | Диспатч `fetchMe` на старте, полноэкранный loader до `initialized`                                           |
| `frontend/src/app/router.tsx`          | Маршруты обёрнуты в `GuestRoute`/`RoleRoute`, все прежние пути сохранены                                     |
| `frontend/src/components/layout/Navbar.tsx` | Меню по роли, имя пользователя, кнопка «Выход»                                                          |
| `frontend/src/pages/LoginPage.tsx`     | Полная форма входа вместо заглушки                                                                            |
| `frontend/src/pages/RegisterPage.tsx`  | Полная форма регистрации вместо заглушки                                                                     |
| `frontend/src/pages/admin/AdminUsersPage.tsx`   | Список + фильтры + пагинация + форма создания                                                    |
| `frontend/src/pages/manager/ManagerUsersPage.tsx` | Список + фильтры + пагинация (без действий управления)                                            |
| `frontend/src/pages/NotFoundPage.tsx`  | Ссылка «На главную»                                                                                          |

Backend-файлы, `.env` и существующая функциональность не изменялись.

## 3. Установленные зависимости

Новые зависимости не устанавливались. Использованы уже подключённые: React 19, TypeScript, Vite, Redux Toolkit, React Router 7, axios, Bootstrap 5 / react-bootstrap, SCSS.

## 4. Результаты проверок

Выполнены команды (реальные результаты):

1. **`npm run lint`** (backend + frontend) — ✅ пройден, ошибок нет.
2. **`npm run build`** (frontend + backend) — ✅ пройден: `tsc -b && vite build` (428 модулей, бандл `index-*.js` 409.46 kB / gzip 131.12 kB, CSS 230.10 kB / gzip 30.72 kB) и `nest build`.
3. **`npm test`** — ✅ пройден: backend Jest — 16/16 тестов passed; frontend Vitest — тестов нет (`No test files found`, код выхода 0, `--passWithNoTests`).
4. **`npm run test:e2e`** — ✅ пройден: 30/30 e2e-тестов Backend Дня 2 (матрица 401/403, login/logout/me, admin/manager users, фильтры, пагинация).
5. **Совместимость с Backend API (curl, локальный запуск на :3100)** — ✅ проверены ровно те вызовы, которые делает frontend:
   - `POST /api/auth/login` с неверным паролем → `401 {"message":"Unauthorized"}` (фронт показывает «Неверный email или пароль»);
   - вход admin → `200 {id, email, name, contactPhone: null, role}`; `GET /api/auth/me` с cookie → `200`;
   - `GET /api/admin/users?limit=21&offset=0&email=&name=&contactPhone=` → `200` массив (пустые фильтры не ломают валидацию);
   - фильтр `email=adm` → частичное совпадение `admin@example.com`;
   - `POST /api/admin/users` → `201`, повторный email → `400` с русским сообщением;
   - `POST /api/client/register` → `201`, повтор → `400` «Пользователь с таким email уже существует»;
   - вход менеджера + `GET /api/manager/users` → `200`;
   - `POST /api/auth/logout` → `200`.
   - После проверок тестовые записи (`smoke-user@…`, `smoke-client@…`) удалены из БД, тестовый процесс остановлен.
   - Ошибка валидации приходит массивом (`{"message":["email must be an email", …]}`) — `getApiErrorMessage()` склеивает такие массивы в одно сообщение.

## 5. Известные ограничения и вопросы

1. **`ProtectedRoute` реализован, но в роутере пока не используется**: все защищённые страницы требуют конкретной роли и обёрнуты в `RoleRoute`. Компонент оставлен по требованиям Дня 2 — пригодится для маршрутов «любой авторизованный» на следующих днях.
2. **Списки пользователей не содержат роль**: `GET /api/admin/users` и `GET /api/manager/users` возвращают только `{id, email, name, contactPhone}` (спецификация, раздел 6.2), поэтому в таблице нет колонки «Роль».
3. **Пагинация без общего числа записей**: API не возвращает `total`, поэтому реализована пагинация «Назад/Вперёд» с запросом `limit + 1` (номер страницы вычисляется из `offset`). Нельзя перейти к конкретной странице по номеру.
4. **Сообщения валидации Backend** приходят на английском (class-validator). Клиентская валидация дублирует эти правила с русскими сообщениями, поэтому на практике пользователь видит русский текст; английские сообщения возможны, если правила на фронте и бэке разойдутся.
5. **Фронтенд-тестов нет**: в `frontend` настроены ESLint и Vitest, но инфраструктуры тестирования компонентов (jsdom, testing-library) нет. Новые зависимости по условию не добавлялись — при желании можно выделить отдельный день/задачу.
6. **Недоступен сервер при старте**: `fetchMe` завершится ошибкой, приложение покажет гостевой интерфейс; глобального баннера «нет связи» нет, ошибки видны при конкретных действиях.
7. **Коммиты и теги не создавались** (ограничение задачи) — после приёмки День 2 нужно закоммитить и поставить тег `day-2` по правилам `AGENTS.md`.

## 6. Ручные проверки в браузере (выполняет пользователь)

Запуск: `docker compose up --build` либо `npm run start:dev` (backend + Vite dev-сервер, Vite проксирует `/api`).

Авторизация:

- [ ] Открыть приложение без входа: идёт «Проверка сессии…», затем гостевое меню («Книги», «Вход», «Регистрация»).
- [ ] Зарегистрировать нового клиента → сообщение об успехе и переход на вход → войти → меню показывает имя и «Выход».
- [ ] Повторная регистрация тем же email → понятная ошибка 400.
- [ ] Вход с неверным паролем → ошибка «Неверный email или пароль».
- [ ] Вход с некорректным email / коротким паролем → ошибки валидации под полями.
- [ ] Перезагрузка страницы → пользователь остаётся авторизованным (меню с именем).
- [ ] «Выход» → гостевое меню, редирект на публичную страницу; повторный переход на `/my/rentals` → страница входа.

Маршрутизация:

- [ ] Гость открывает `/admin/users` и `/my/rentals` → перенаправление на `/login`.
- [ ] Клиент открывает `/admin/users` и `/manager/users` → редирект на `/` (чужая страница не отображается).
- [ ] Admin входит → открывает `/admin/users`; manager — `/manager/users`.
- [ ] Неизвестный маршрут (например, `/asdf`) → страница 404.
- [ ] После входа с `/admin/users` (гостем) admin возвращается на `/admin/users`.

Управление пользователями:

- [ ] Admin видит таблицу пользователей; фильтры по email/имени/телефону сокращают список; «Сбросить» возвращает все записи.
- [ ] Создание пользователя (все роли) → форма очищается, список обновляется, новый пользователь может войти со своими email/паролем.
- [ ] Повторный email при создании → ошибка из сервера; короткий пароль → ошибка валидации; кнопка недоступна во время отправки.
- [ ] Создать больше 20 пользователей и проверить переключение страниц «Назад/Вперёд» (на последней странице «Вперёд» отключена; на первой — «Назад»).
- [ ] Пустой результат поиска → сообщение «Пользователи не найдены».
- [ ] Manager видит список и фильтры, но не видит форму создания и других административных действий.
- [ ] Проверить адаптивность: сузить окно — меню сворачивается в «бургер», таблица прокручивается по горизонтали.

