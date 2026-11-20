import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import configuration from './config/configuration';
import { validateConfig } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { LibrariesModule } from './libraries/libraries.module';
import { RentalsModule } from './rentals/rentals.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Путь к .env — от расположения этого модуля (backend/dist), а не от
      // текущей директории: npm start из корня и nest start из backend
      // должны читать один и тот же файл .env в корне репозитория.
      envFilePath: join(__dirname, '..', '..', '.env'),
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
    // Обложки книг: раздача каталога UPLOADS_DIR по /uploads/<имя файла>.
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          serveRoot: '/uploads',
          rootPath: config.get<string>('app.uploads.dir'),
          // Каталог без index.html: отсутствующий файл даёт 404.
          serveStaticOptions: { index: false },
        },
      ],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    LibrariesModule,
    RentalsModule,
    SupportModule,
  ],
})
export class AppModule {}
