import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { UsersService } from './users.service';

/** Список пользователей: только manager (спецификация, раздел 6.2). */
@Controller('manager/users')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('manager')
export class ManagerUsersController {
  constructor(private readonly usersService: UsersService) {}

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
