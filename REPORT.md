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

---

# Отчёт: День 3 — Backend «Библиотеки и книги»

Выполнен только backend-часть задания Дня 3 (п. «Backend» раздела 10 спецификации). Frontend-часть (страница поиска, `libraries.api.ts`/`books.api.ts`, срезы) не изменялась — по ограничению задачи.

## 1. Что реализовано

**Сущности** (раздел 4 спецификации):

- `Library` (`libraries`): `id`, `name` (200), `address` (300), `description?`, `createdAt`, `updatedAt`;
- `Book` (`books`): `id`, `libraryId` (FK → `libraries`, `ON DELETE CASCADE`), `title` (300), `author` (200), `year?`, `description?`, `coverImage?` (путь `/uploads/<uuid>.<ext>`), `isAvailable` (default `true`), `totalCopies` (default 1), `availableCopies` (default 1), `createdAt`, `updatedAt`. Индексы по `title`, `author`, `libraryId`; CHECK-ограничения `totalCopies >= 1` и `0 <= availableCopies <= totalCopies`.

**Публичные маршруты** (без авторизации):

| Метод | Путь | Поведение |
| --- | --- | --- |
| GET | `/api/common/libraries` | список библиотек, пагинация `limit`/`offset` |
| GET | `/api/common/libraries/:id` ⭐ | одна библиотека, 404 если нет |
| GET | `/api/common/books` | фильтры `library`, `author`, `title`, `availableOnly` + пагинация; в ответе у книги объект `library: {id, name, address}` |
| GET | `/api/common/books/:id` ⭐ | книга с библиотекой, 404 если нет |

**Админские маршруты** (только роль `admin`, `AuthenticatedGuard` + `RolesGuard`):

- `POST|PUT|DELETE /api/admin/libraries[/:id]` — JSON;
- `POST|PUT|DELETE /api/admin/books[/:id]` — `multipart/form-data` с необязательным полем `coverImage` (`FileInterceptor`); `PUT` также принимает JSON без файла;
- `DELETE` возвращает `{ "success": true }`.

**Правила и особенности:**

- Обложки: только `image/jpeg`, `image/png`, `image/webp`, размер ≤ 2 МБ — иначе `400`. Имя файла генерируется (uuid + расширение из mime-типа), клиентское имя не используется. Файлы раздаются вторым `ServeStaticModule` по `/uploads/<файл>` (`index: false` — отсутствующий файл даёт 404).
- При замене обложки старый файл удаляется с диска; при удалении книги — тоже; при удалении библиотеки — удаляются обложки всех её книг (до каскадного удаления собираются пути).
- Пересчёт при смене `totalCopies`: выданные = `totalCopies - availableCopies`; новый `availableCopies = clamp(новый totalCopies - выданные, 0, новый totalCopies)`; `isAvailable = availableCopies > 0`.
- 404 — отсутствующие сущности и нечисловой `:id` (через `ParseIntPipe` → 400 для «abc»); 409 — удаление при активных арендах (заглушка, см. п. 4); 400 — невалидные DTO, несуществующий `libraryId`, неверный тип/размер файла.
- Фильтр `library`: если значение состоит из цифр — по `libraryId`, иначе — `ILIKE` по названию библиотеки. `title`/`author` — `ILIKE` с экранированием `%`/`_`.

## 2. Созданные и изменённые файлы

Новые (все в `backend/src/libraries/`):

- `entities/library.entity.ts`, `entities/book.entity.ts` — сущности с индексами и CHECK;
- `dto/library.dto.ts`, `dto/book.dto.ts`, `dto/search-books-query.dto.ts` — DTO (создание/обновление/поиск; строковые значения multipart приводятся к числу через `@Transform`);
- `libraries.service.ts`, `books.service.ts` — сервисы;
- `common-libraries.controller.ts`, `common-books.controller.ts` — публичные маршруты;
- `admin-libraries.controller.ts`, `admin-books.controller.ts` — админский CRUD (книги — multipart);
- `cover-upload.config.ts` — `validateCoverFile` / `saveCoverFile` / `removeCoverFile`, константы поля и лимитов;
- `book.mapper.ts` — явный маппер книги в ответ API (связанная библиотека сокращается до `{id, name, address}`);
- `interfaces/active-rentals-checker.interface.ts` — интерфейс + токен DI `ACTIVE_RENTALS_CHECKER`;
- `no-active-rentals-checker.ts` — заглушка (всегда `false`);
- `books.service.spec.ts` — unit-тесты.

Изменённые:

- `backend/src/app.module.ts` — подключён `LibrariesModule` и второй `ServeStaticModule` для `/uploads`; путь к `.env` сделан абсолютным (`join(__dirname, '..', '..', '.env')`) — чинит `npm start` из корня репозитория;
- `backend/src/config/configuration.ts` — `UPLOADS_DIR` разрешается от корня репозитория, а не от CWD;
- `backend/src/database/seed-demo.ts` — новый скрипт демо-данных;
- `backend/package.json` — скрипт `seed:demo` (`nest build && node dist/database/seed-demo.js`);
- `backend/test/app.e2e-spec.ts` — блок «День 3: библиотеки и книги» (+43 e2e-теста);
- `backend/test/setup-env.ts` — `UPLOADS_DIR` e2e-тестов указывает во временный каталог (не трогает `backend/uploads`);
- `docs/DECISIONS.md` — раздел «День 3» (10 решений).

## 3. Проверка активных аренд (заглушка)

Интерфейс `ActiveRentalsChecker` (`hasActiveRentalsForBook`, `hasActiveRentalsForLibrary`) подключён в сервисы через токен DI `ACTIVE_RENTALS_CHECKER`. Реализация на Дне 3 — `NoActiveRentalsChecker` (всегда `false`), поскольку модуль аренды ещё не существует. На Дне 4 токен подключается к `RentalsService` без изменения кода книг и библиотек.

## 4. Демо-данные

```bash
npm run seed:demo
```

Создаёт 3 библиотеки и 15 книг (без обложек — фронтенд показывает плейсхолдер). Идемпотентно: библиотеки сверяются по названию, книги — по паре (название, автор, библиотека); повторный запуск пишет «создано 0/0, существовало книг 15».

## 5. Результаты проверок (выполнены в этой сессии)

| Проверка | Команда | Результат |
| --- | --- | --- |
| Линтинг backend + frontend | `npm run lint` | без ошибок |
| Сборка frontend + backend | `npm run build` | успешно |
| Unit-тесты backend | `npm test` | **44 passed** (2 suites: `books.service.spec`, `users.service.spec`) |
| Unit-тесты frontend | `npm test` | без тестовых файлов (Vitest, `passWithNoTests`) — как и на Дне 2 |
| E2E backend | `npm run test:e2e` | **73 passed** (30 Дня 2 + 43 Дня 3) |
| Демо-данные | `npm run seed:demo` ×2 | 3/15 → 0/0, существовало 15 (идемпотентно) |

Ключевые e2e-сценарии Дня 3: multipart-создание книги с обложкой → файл открывается через `/uploads/...`; 400 на `text/plain` и на файл > 2 МБ; 401/403 на админских маршрутах; фильтры `title`/`author`/`library` (id и название)/`availableOnly` + пагинация; пересчёт `availableCopies` при смене `totalCopies`; замена обложки удаляет старый файл; удаление библиотеки каскадно удаляет книги; 404/400 на несуществующих/нечисловых id.

**Ручная проверка работающего API (curl, сервер на `HTTP_PORT=3100`, т.к. порт 3000 занят Docker-контейнером `library-booking-app-1`):**

- `GET /api/health` → `200 {"status":"ok"}`;
- `GET /api/common/libraries` → 3 демо-библиотеки;
- `GET /api/common/books?limit=100` → 15 книг;
- `GET /api/common/books?title=пр&availableOnly=true` → 3 книги, у каждой заполнен `library {id, name, address}`;
- `GET /api/common/books?library=Северная` → 5 книг (фильтр по названию);
- `GET /api/common/books/999999` → 404;
- `POST /api/admin/libraries` без сессии → 401; с сессией клиента → 403;
- вход админа → `POST /api/admin/books` с PNG-обложкой → `201`, `coverImage: /uploads/<uuid>.png`; `GET` обложки → `200 image/png`;
- файл `text/plain` → 400; файл > 2 МБ → 400;
- `DELETE` тестовой книги → `{"success":true}`, обложка после удаления → 404.

Тестовые записи smoke-проверки (книга, два клиента) удалены из БД; временный сервер остановлен; в dev-БД остались только демо-данные (3 библиотеки, 15 книг).

## 6. Ограничения и вопросы

1. **409 при удалении пока не достижим на практике**: заглушка `NoActiveRentalsChecker` всегда возвращает `false`. Полная проверка заработает на Дне 4 после подключения `RentalsService` (покрыта unit-тестом с моком).
2. **Размер файла проверяется после приёма в память**: лимит multer не ставился, потому что он даёт 413, а спецификация требует 400. Очень большой файл целиком буферизуется до проверки — приемлемо для учебного проекта.
3. **`GET /api/admin/libraries` не добавлен**: в контракте (раздел 6.3) такого эндпоинта нет — списком пользуется публичный `/api/common/libraries`.
4. **Демо-книги без обложек**: реальные изображения не прикладывались, `coverImage = null`.
5. **Коммит и тег `day-3` не создавались** (ограничение задачи) — после приёмки нужно закоммитить и поставить тег по правилам `AGENTS.md`.
6. **Frontend-часть Дня 3 не выполнялась** (страница поиска и API-клиенты) — вне объёма этой задачи.


---

# Отчёт: День 3 — Frontend «Поиск книг»

Дата: 2026-11-16

## 1. Созданные и изменённые файлы

| Файл | Действие | Содержание |
| --- | --- | --- |
| `frontend/src/types/index.ts` | Изменён | `Library` (nullable `description`), новый `BookLibrary {id,name,address}`, `Book` приведён к фактическому ответу `toBookResponse` (без `libraryId`, nullable `year/description/coverImage`, `createdAt/updatedAt`), новый `BookFilters {library, author, title, availableOnly}` |
| `frontend/src/api/libraries.api.ts` | Создан | `fetchLibraries({limit, offset})` → `GET /api/common/libraries`, `fetchLibrary(id)` |
| `frontend/src/api/books.api.ts` | Создан | `searchBooks(params)` → `GET /api/common/books` (фильтры + пагинация), `fetchBook(id)` |
| `frontend/src/features/libraries/librariesSlice.ts` | Создан | Загрузка списка библиотек: `items/loading/error` |
| `frontend/src/features/books/booksSlice.ts` | Создан | Поиск книг + защита от гонок через `requestId` из `action.meta.requestId` |
| `frontend/src/app/store.ts` | Изменён | Подключены редьюсеры `libraries` и `books` |
| `frontend/src/components/books/BookFilters.tsx` | Создан | Селект библиотек, автор, название, checkbox «Только доступные», «Найти»/«Сбросить» |
| `frontend/src/components/books/BookCard.tsx` | Создан | Обложка с `onError`-плейсхолдером, название, автор, библиотека, доступность, ссылка `/books/:id` |
| `frontend/src/pages/HomePage.tsx` | Переписан | Публичная страница поиска: фильтры, состояния loading/error/empty, список, пагинация |
| `frontend/src/styles/pages/HomePage.scss` | Создан | Стили карточки книги (обложка 3:4, плейсхолдер) на токенах из `variables.scss` |
| `frontend/src/styles/index.scss` | Изменён | Добавлен импорт `./pages/HomePage` |

Backend, `.env`, работающие модули Дней 1–2 не изменялись. Коммит и тег `day-3` не создавались.

## 2. API-запросы и Redux slices

- `librariesApi.fetchLibraries({limit: 100, offset: 0})` → `GET /api/common/libraries` — список для селекта фильтра (один запрос на старте страницы).
- `booksApi.searchBooks({limit: PAGE_SIZE+1, offset, library, author, title, availableOnly})` → `GET /api/common/books` — публичный поиск.
- Оба используют существующий Axios-инстанс `api/http.ts` (второго инстанса нет), ошибки — через `getApiErrorMessage()`.
- **Защита от устаревших ответов**: в `pending` сохраняется `action.meta.requestId`, в `fulfilled`/`rejected` ответ игнорируется, если `requestId` не совпадает с текущим. Быстрые изменения фильтров не могут перезаписать более свежий результат.
- Пагинация: `limit = PAGE_SIZE + 1` (метод из `AdminUsersPage`), `hasNext = items.length > PAGE_SIZE`, отображается `slice(0, PAGE_SIZE)`; `PAGE_SIZE = 12`.

## 3. Компоненты и страница

- `BookFilters` — поля: выбор библиотеки (из API), автор, название, «Только доступные»; отправка по кнопке «Найти», «Сбросить» очищает поля и сбрасывает поиск; при применении страница всегда возвращается на offset 0.
- `BookCard` — название (ссылка на `/books/:id`), автор, библиотека (`library.name` или «Библиотека не указана»), бейдж доступности и `availableCopies/totalCopies`, обложка по относительному пути `coverImage` (например `/uploads/<uuid>.png`) как есть; при `coverImage = null` или ошибке загрузки (`onError`) — плейсхолдер «Нет обложки».
- `HomePage` — карточка «Фильтры» (select библиотек с собственным loading/error и кнопкой «Повторить»), затем: `loading` → лоадер; `error` → `ErrorAlert` + «Повторить»; пустой результат → «По вашему запросу ничего не найдено» + «Сбросить фильтры»; иначе сетка карточек + `Pagination`.
- Страница публичная: маршруты `/` открыты и гостям, и авторизованным пользователям (ограничений в `router.tsx` нет).

## 4. Результаты проверок

| Проверка | Результат |
| --- | --- |
| `npm run lint` (корень) | ✅ оба workspace, exit 0 |
| `npm run build` (корень) | ✅ frontend (`tsc -b && vite build`) и backend (`nest build`) собраны (предупреждения Sass об `@import` — существовали и раньше) |
| `npm test` (корень) | ✅ backend: 2 сюита, 44 теста; frontend: vitest — тестов нет, exit 0 |
| `npm run test:e2e` | ✅ 1 сюит, 73 теста (включая фильтры и пагинацию `GET /api/common/books`) |

**Рантайм-сверка контракта API с типами (curl, локальный запуск собранного backend + PostgreSQL):**

- `GET /api/common/libraries?limit=100&offset=0` → массив `{id, name, address, description, createdAt, updatedAt}` — соответствует типу `Library`;
- `GET /api/common/books?limit=13&offset=0&availableOnly=true` → `{id, title, author, year, description, coverImage: null, isAvailable, totalCopies, availableCopies, createdAt, updatedAt, library: {id, name, address}}` — соответствует типу `Book`;
- фильтры: `library=1` → 5 книг одной библиотеки; `author=Толстой` → 1 книга; `title=война&availableOnly=true` → «Война и мир»; несуществующее название → `[]` (пустой результат);
- 15 книг при `PAGE_SIZE = 12` → первая страница 12 + признак следующей, вторая — 3;
- **обложки**: создана временная книга с PNG через `POST /api/admin/books` → `coverImage: "/uploads/<uuid>.png"`; `GET /uploads/<uuid>.png` → `200 image/png` (не перехвачено SPA); временная книга удалена → книга и файл обложки → 404. Демо-данные восстановлены (3 библиотеки, 15 книг).

## 5. Критерии: что проверено автоматически

✅ Загрузка библиотек и книг из API (типы сверены с реальными ответами, фильтры проверены curl'ом).
✅ Фильтры по библиотеке, автору, названию и «Только доступные», включая комбинации.
✅ Сброс фильтров возвращает полный список (offset → 0, фильтры пустые).
✅ Пагинация (limit+1/hasNext, страница 1 → 12 книг, страница 2 → 3).
✅ Пустое состояние при нулевых результатах (проверено на API; рендер — код, типизирован).
✅ Ошибка API → сообщение + «Повторить» (для поиска и для списка библиотек).
✅ Обложки через относительный `/uploads/...`, плейсхолдер при отсутствии/ошибке.
✅ Lint / build / unit / e2e — зелёные.

## 6. Что проверить вручную в браузере

Ручную браузерную проверку **я не выполнял** (в среде нет браузера/автоматизации). Проверьте:

1. Главная страница открывается у гостя и у авторизованного пользователя, список книг отображается.
2. Каждый фильтр и их комбинации визуально обновляют список, страница возвращается на 1-ю.
3. «Только доступные» исключает книги без свободных экземпляров.
4. «Сбросить» возвращает полный список; пустой запрос показывает пустое состояние.
5. Пагинация «Назад/Вперёд» листает без потери фильтров.
6. У демо-книг (`coverImage = null`) виден плейсхолдер; у книги с обложкой — изображение (загрузите обложку через админку).
7. Ошибка API (например, остановленный backend) → сообщение и кнопка «Повторить».
8. Клик по карточке ведёт на `/books/:id` (сама страница книги — следующий шаг).

## 7. Известные ограничения

1. **Figma-макеты недоступны** (файл `2Z5CVDKhAHi4AfAm3vHHjn` — нет прав редактора, `create_session`/`get_screenshot` отклонены). По спецификации (раздел 7) сделан простой интерфейс на Bootstrap 5 с существующими токенами из `variables.scss`.
2. **Демо-книги без обложек** (`coverImage = null`) — везде плейсхолдер; реальные изображения нужно загрузить через админку.
3. **Фильтр библиотек** загружается одним запросом `limit=100` — при большем числе библиотек потребуется пагинация селекта.
4. **`BookPage` не реализована** — вне объёма Дня 3 (ссылка с карточки ведёт на маршрут, который будет доработан).
5. Коммит и тег `day-3` не создавались (ограничение задачи).
