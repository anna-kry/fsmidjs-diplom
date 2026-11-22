import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { AppModule } from './app.module';
import { SessionIoAdapter } from './common/adapters/session-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('/api');
  app.use(helmet());

  // Сессии хранятся в памяти приложения (MemoryStore): перезапуск сервера
  // сбрасывает вход пользователей — это ожидаемо для этого проекта
  // (спецификация, раздел 2, п. 14).
  const sessionMiddleware = session({
    name: 'sid',
    secret: configService.get<string>('app.session.secret'),
    resave: false,
    saveUninitialized: false,
    store: new session.MemoryStore(),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: configService.get<boolean>('app.session.cookieSecure'),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    },
  });
  const middlewares = [
    sessionMiddleware,
    passport.initialize(),
    passport.session(),
  ];
  middlewares.forEach((middleware) => app.use(middleware));

  // Те же middleware выполняются на handshake WebSocket-соединений,
  // поэтому сокеты видят сессию, открытую при входе через HTTP.
  app.useWebSocketAdapter(new SessionIoAdapter(app, middlewares));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.HTTP_PORT ?? 3000, process.env.HTTP_HOST);
}

bootstrap();
