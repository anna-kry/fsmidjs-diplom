export function validateConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required: string[] = [
    'HTTP_HOST',
    'HTTP_PORT',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'SESSION_SECRET',
    'COOKIE_SECURE',
    'DB_SYNCHRONIZE',
    'UPLOADS_DIR',
    'SEED_ADMIN_EMAIL',
    'SEED_ADMIN_PASSWORD',
    'SEED_MANAGER_EMAIL',
    'SEED_MANAGER_PASSWORD',
  ];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return config;
}
