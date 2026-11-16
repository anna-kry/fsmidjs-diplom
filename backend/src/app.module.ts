import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import configuration from './config/configuration';
import { validateConfig } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
      load: [configuration],
      validate: validateConfig,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      // path-to-regexp v8 (используется в @nestjs/serve-static v5): суффикс "*" без
      // имени параметра недопустим, поэтому wildcard записывается как {*any}.
      // Матчит /api, /api/health, /api/auth/login, но не /apifoo или /books.
      exclude: ['/api/{*any}', '/uploads/{*any}', '/socket.io/{*any}'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
