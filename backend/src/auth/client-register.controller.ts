import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotAuthenticatedGuard } from '../common/guards/not-authenticated.guard';
import { PasswordService } from '../users/password.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

/**
 * Публичная регистрация клиента.
 * Роль всегда client; повторный email → 400; уже вошедшему → 403.
 */
@Controller('client/register')
@UseGuards(NotAuthenticatedGuard)
export class ClientRegisterController {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {}

  @Post()
  async register(@Body() dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash: await this.passwordService.hash(dto.password),
      name: dto.name,
      contactPhone: dto.contactPhone,
      role: 'client',
    });

    return { id: user.id, email: user.email, name: user.name };
  }
}
