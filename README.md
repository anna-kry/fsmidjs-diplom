# Library Booking — агрегатор поиска и бронирования книг в библиотеках

Веб-приложение для поиска книг в библиотеках, онлайн-бронирования (аренды) экземпляров
и чата техподдержки между клиентом и менеджером в реальном времени.

Роли: **client** (регистрируется сам), **manager** (управляет арендами и обращениями),
**admin** (управляет библиотеками, книгами и пользователями).

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Node.js 20, NestJS 11, TypeScript 6, TypeORM 0.3, PostgreSQL 16, Passport (local, session), bcrypt, Socket.IO, class-validator, helmet |
| Frontend | React 19, TypeScript, Vite 8, **Bootstrap 5** (react-bootstrap), Redux Toolkit, React Router 8, axios, socket.io-client |
| Инфраструктура | Docker (multi-stage `node:20-slim`), docker compose (сервисы `app` и `db`), npm workspaces |

## Структура репозитория

```
library-booking/
├── README.md                    # этот файл
├── AGENTS.md                    # краткие правила работы с проектом
├── OPENCODE_SPEC.md             # техническое задание (в корне репозитория)
├── package.json                 # npm workspaces: backend, frontend
├── package-lock.json            # фиксированные версии зависимостей
├── Dockerfile                   # multi-stage: сборка frontend+backend → npm start
├── docker-compose.yaml          # сервисы: app, db (postgres:16)
├── .env-example                 # имена переменных окружения без значений
├── .dockerignore, .gitignore, .prettierrc
├── docs/
│   ├── API.md                   # контракт REST API и WebSocket
│   ├── DECISIONS.md             # принятые решения
│   ├── PLAN-7-DAYS.md           # план работ по дням
│   └── figma.md                 # пояснения к макету
├── scripts/
│   └── smoke.sh                 # curl-сценарий проверки основных сценариев
├── backend/
│   ├── package.json, nest-cli.json, tsconfig.json, tsconfig.build.json
│   ├── uploads/                 # обложки книг (в .gitignore, в Docker — volume)
│   ├── src/
│   │   ├── main.ts              # префикс /api, helmet, сессии, ValidationPipe
│   │   ├── app.module.ts
│   │   ├── config/              # configuration.ts, env.validation.ts
│   │   ├── database/            # database.module.ts, seed.service.ts, seed-demo.ts
│   │   ├── common/              # guards, decorators, filters, dto, utils, types
│   │   ├── users/               # сущность User, сервисы, admin/manager-контроллеры
│   │   ├── auth/                # login/logout/me, регистрация клиента, passport-local
│   │   ├── libraries/           # Library, Book, поиск, админский CRUD, загрузка обложек
│   │   ├── rentals/             # BookRental, брони клиента и смена статусов менеджером
│   │   └── support/             # SupportRequest, Message, REST + Socket.IO gateway
│   └── test/                    # e2e-тесты (jest-e2e.json, app.e2e-spec.ts)
└── frontend/
    ├── package.json, vite.config.ts, tsconfig*.json, index.html
    └── src/
        ├── main.tsx, App.tsx
        ├── app/                 # store.ts, hooks.ts, router.tsx
        ├── api/                 # http.ts, auth/users/libraries/books/rentals/support.api.ts, socket.ts
        ├── features/            # auth, books, libraries, rentals, support, users (Redux Toolkit)
        ├── components/
        │   ├── layout/          # Layout.tsx, Navbar.tsx
        │   ├── guards/          # ProtectedRoute, RoleRoute, GuestRoute
        │   ├── books/           # BookCard, BookFilters, RentalForm
        │   ├── support/         # ChatWindow, MessageList, MessageForm
        │   └── common/          # Pagination, ErrorAlert, Loader, ConfirmModal
        ├── pages/               # HomePage, BookPage, LoginPage, RegisterPage,
        │   ├── admin/           #   MyRentalsPage, SupportPage, NotFoundPage
        │   └── manager/         #   AdminUsers/Books/LibrariesPage, ManagerUsers/Rentals/SupportPage
        ├── types/index.ts        # ID, User, Library, Book, BookRental, SupportRequest, Message
        └── styles/index.css
```

## Переменные окружения

Файл `.env` не коммитится — скопируйте `.env-example` и заполните значения.

| Переменная | Описание | Значение для локального запуска |
|------------|----------|---------------------------------|
| `HTTP_HOST` | Хост, на котором слушает приложение | `0.0.0.0` |
| `HTTP_PORT` | Порт приложения (API + раздача SPA) | `3000` |
| `POSTGRES_HOST` | Хост PostgreSQL | `localhost` (в Docker — `db`) |
| `POSTGRES_PORT` | Порт PostgreSQL | `5432` |
| `POSTGRES_USER` | Пользователь БД | `library` |
| `POSTGRES_PASSWORD` | Пароль БД | `library` |
| `POSTGRES_DB` | Имя базы | `library` |
| `SESSION_SECRET` | Секрет подписи cookie сессии | любая длинная случайная строка |
| `COOKIE_SECURE` | Флаг `Secure` у cookie (`true`/`false`) | `false` для http-локального запуска |
| `DB_SYNCHRONIZE` | Автосинхронизация схемы TypeORM | `true` для разработки, `false` в продакшене |
| `UPLOADS_DIR` | Папка для обложек книг | `./backend/uploads` |
| `SEED_ADMIN_EMAIL` | Email администратора, создаётся при старте | `admin@library.local` |
| `SEED_ADMIN_PASSWORD` | Пароль администратора | `Admin123!` |
| `SEED_MANAGER_EMAIL` | Email менеджера, создаётся при старте | `manager@library.local` |
| `SEED_MANAGER_PASSWORD` | Пароль менеджера | `Manager123!` |

## Запуск через Docker

```bash
cp .env-example .env      # заполнить значения по таблице выше
docker compose up --build
```

Приложение будет доступно на `http://localhost:${HTTP_PORT}/`, API — на
`http://localhost:${HTTP_PORT}/api` (health-check: `/api/health`).
Том `uploads` сохраняет загруженные обложки между перезапусками.

## Запуск на хосте

Нужен установленный PostgreSQL 16 и заполненный `.env`.

```bash
npm ci
npm run build
npm start          # production: node backend/dist/main.js
```

Режим разработки:

```bash
npm run start:dev  # backend (watch) + Vite dev-сервер на 5173 с proxy на :3000
```

## Тестовые аккаунты

- **admin** — `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (управление библиотеками, книгами, пользователями).
- **manager** — `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD` (аренды, обращения, список пользователей).
- **client** — регистрируется через `/register` в интерфейсе (роль `client` выдаётся автоматически).

Демо-данные (3 библиотеки и ~15 книг):

```bash
npm run seed:demo
```

## Линтинг и тесты

```bash
npm run lint        # eslint (backend + frontend)
npm run test        # jest (backend) + vitest (frontend)
npm run test:e2e    # e2e-сценарии на supertest
```

## Документация

- [docs/API.md](docs/API.md) — контракт REST API и WebSocket-события.
- [docs/DECISIONS.md](docs/DECISIONS.md) — принятые технические решения.
- [docs/PLAN-7-DAYS.md](docs/PLAN-7-DAYS.md) — план работ.
- [OPENCODE_SPEC.md](OPENCODE_SPEC.md) — исходное техническое задание.

Дополнительные инструменты:
[NestJS](https://docs.nestjs.com/) · [TypeORM](https://typeorm.io/) ·
[Passport](https://www.passportjs.org/) · [Socket.IO](https://socket.io/) ·
[Redux Toolkit](https://redux-toolkit.js.org/) · [React Router](https://reactrouter.com/) ·
[Bootstrap 5](https://getbootstrap.com/docs/5.3/) · [Vite](https://vite.dev/) ·
[React](https://react.dev/)
