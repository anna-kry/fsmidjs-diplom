# Отчёт: День 1 — этап 1 (backend-фундамент)

Дата: 2026-11-12

## Что реализовано

| Файл | Действие | Содержание |
|------|----------|------------|
| `backend/src/main.ts` | Перезаписан | NestJS bootstrap: `setGlobalPrefix('/api')`, `helmet()`, глобальный `ValidationPipe({whitelist, forbidNonWhitelisted, transform})`, `app.listen()` |
| `backend/src/app.module.ts` | Перезаписан | `ConfigModule.forRoot()` (global, с `envFilePath: '.env'`, `load: [configuration]`, `validate: validateConfig`), импорты `DatabaseModule`, `HealthModule` |
| `backend/src/config/env.validation.ts` | Создан | Проверка всех обязательных env-переменных при старте; выбрасывает `Error` с перечислением отсутствующих |
| `backend/src/config/configuration.ts` | Создан | Фабрика конфига через `registerAs('app', …)`: http, postgres, session, db, uploads, seed |
| `backend/src/database/database.module.ts` | Создан | `TypeOrmModule.forRootAsync()` с PostgreSQL, `synchronize` из `DB_SYNCHRONIZE`, `autoLoadEntities: true`, экспортирует `TypeOrmModule` |
| `backend/src/health/health.controller.ts` | Создан | `GET /health` → `{ status: 'ok' }` |
| `backend/src/health/health.module.ts` | Создан | Модуль с `HealthController` |
| `.env` | Создан (локально, не коммитится) | Значения для локального запуска; в `.gitignore` |

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
