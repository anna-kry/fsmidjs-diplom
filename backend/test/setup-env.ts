/**
 * Изолированная тестовая конфигурация для e2e.
 *
 * Файл подключается первым импортом в спеке — до импорта AppModule,
 * в котором ConfigModule загружает .env. Заданные здесь переменные окружения
 * имеют приоритет: dotenv не перезаписывает уже существующие значения.
 *
 * Тесты работают с отдельной базой данных и не трогают реальные данные.
 * Значения SEED_* — тестовые, они действуют только в этом процессе и только
 * для тестовой базы (SeedService создаст из них admin и manager).
 */

export const TEST_DATABASE = 'library_booking_e2e';

process.env.POSTGRES_DB = TEST_DATABASE;
process.env.DB_SYNCHRONIZE = 'true';
// Тесты ходят по HTTP, поэтому secure-cookie всегда отключён.
process.env.COOKIE_SECURE = 'false';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'e2e-test-secret';
process.env.HTTP_HOST = process.env.HTTP_HOST || '127.0.0.1';
process.env.HTTP_PORT = process.env.HTTP_PORT || '3000';
process.env.SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@e2e.test';
process.env.SEED_ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';
process.env.SEED_MANAGER_EMAIL =
  process.env.SEED_MANAGER_EMAIL || 'manager@e2e.test';
process.env.SEED_MANAGER_PASSWORD =
  process.env.SEED_MANAGER_PASSWORD || 'Manager12345!';
