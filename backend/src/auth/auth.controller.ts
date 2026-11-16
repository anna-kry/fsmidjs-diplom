import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { NotAuthenticatedGuard } from '../common/guards/not-authenticated.guard';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

/** Публичное представление пользователя: пароль и хеш в ответы не попадают. */
function toAuthUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    contactPhone: user.contactPhone,
    role: user.role,
  };
}

@Controller('auth')
export class AuthController {
  /**
   * Вход по email и паролю.
   * 200 + сессионная cookie; 401 при неверных данных; 403, если уже вошёл.
   */
  @Post('login')
  @HttpCode(200)
  @UseGuards(NotAuthenticatedGuard, AuthGuard('local'))
  async login(@Body() _dto: LoginDto, @Req() req: Request) {
    const user = req.user as User;

    // AuthGuard(@nestjs/passport) по умолчанию работает с session: false,
    // поэтому сохраняем вход в сессию вручную.
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => (err ? reject(err) : resolve()));
    });

    return toAuthUser(user);
  }

  /**
   * Выход: сессия уничтожается, cookie sid удаляется.
   * 200; без сессии — 401.
   */
  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // req.logout() из passport регенерирует сессию и приводит к установке новой
    // cookie взамен удаляемой, поэтому сессия уничтожается целиком.
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie('sid', { path: '/' });

    return {};
  }

  /** Текущий пользователь по сессии. 401 без сессии. */
  @Get('me')
  @UseGuards(AuthenticatedGuard)
  me(@CurrentUser() user: User) {
    return toAuthUser(user);
  }
}
