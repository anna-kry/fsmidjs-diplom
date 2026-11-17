import { isAbsolute, resolve } from 'path';
import { registerAs } from '@nestjs/config';

// Корень репозитория: этот файл лежит на трёх уровнях ниже него
// и в исходниках (src/config), и в сборке (dist/config).
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

/**
 * Относительный UPLOADS_DIR отсчитывается от корня репозитория,
 * а не от текущей рабочей директории — иначе `nest start` из каталога
 * backend создал бы второй вложенный каталог backend/backend/uploads.
 */
function resolveUploadsDir(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return isAbsolute(value) ? value : resolve(REPO_ROOT, value);
}

export default registerAs('app', () => ({
  http: {
    host: process.env.HTTP_HOST,
    port: parseInt(process.env.HTTP_PORT ?? '0', 10),
  },
  postgres: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT ?? '0', 10),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
  session: {
    secret: process.env.SESSION_SECRET,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  },
  db: {
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  uploads: {
    dir: resolveUploadsDir(process.env.UPLOADS_DIR),
  },
  seed: {
    admin: {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    },
    manager: {
      email: process.env.SEED_MANAGER_EMAIL,
      password: process.env.SEED_MANAGER_PASSWORD,
    },
  },
}));
