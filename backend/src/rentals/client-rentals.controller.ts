import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ID } from '../common/types/id.type';
import type { User } from '../users/entities/user.entity';
import { CreateRentalDto } from './dto/create-rental.dto';
import { SearchRentalsQueryDto } from './dto/search-rentals-query.dto';
import { toRentalListResponse, toRentalResponse } from './rental.mapper';
import { RentalsService } from './rentals.service';

/**
 * Свои аренды клиента (спецификация, раздел 6.4).
 * Клиент видит и управляет только собственными бронями:
 * чужая бронь — 403, чужой статус — 400.
 */
@Controller('client/rentals')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('client')
export class ClientRentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateRentalDto) {
    const rental = await this.rentalsService.create(user.id, dto);
    return toRentalResponse(rental);
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query() query: SearchRentalsQueryDto,
  ) {
    const rentals = await this.rentalsService.findByUser(user.id, {
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
    return rentals.map(toRentalListResponse);
  }

  @Delete(':id')
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: ID,
  ) {
    const rental = await this.rentalsService.cancelByClient(id, user.id);
    return toRentalResponse(rental);
  }
}
