import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { PasswordService } from './password.service';
import { UsersService } from './users.service';

/** Управление пользователями: только admin (спецификация, раздел 6.2). */
@Controller('admin/users')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash: await this.passwordService.hash(dto.password),
      name: dto.name,
      contactPhone: dto.contactPhone,
      role: dto.role,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      contactPhone: user.contactPhone,
      role: user.role,
    };
  }

  @Get()
  async findAll(@Query() query: SearchUsersQueryDto) {
    const users = await this.usersService.findAll(query);

    return users.map(({ id, email, name, contactPhone }) => ({
      id,
      email,
      name,
      contactPhone,
    }));
  }
}
