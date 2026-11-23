import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import 'dotenv/config';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5433', 10),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: process.env.POSTGRES_DB ?? 'library',
  synchronize: false,
  logging: true,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
});

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('Data source initialized');
    const opts = dataSource.options as { host?: string; port?: number };
    console.log('Connected to:', opts.host, ':', opts.port);
    
    const pendingMigrations = await dataSource.showMigrations();
    console.log('Pending migrations:', pendingMigrations);
    
    const migrations = await dataSource.runMigrations();
    console.log('Migrations run:', migrations.map(m => m.name));
    
    await dataSource.destroy();
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();