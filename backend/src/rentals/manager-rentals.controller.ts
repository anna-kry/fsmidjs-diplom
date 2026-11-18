import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ID } from '../common/types/id.type';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ManagerRentalsQueryDto } from './dto/search-rentals-query.dto';
import { toRentalManagerResponse, toRentalResponse } from './rental.mapper';
import { RentalsService } from './rentals.service';

/**
 * Все аренды и смена статуса — только менеджер (раздел 6.7).
 * Недопустимый переход статуса возвращает 400 (раздел 2, п. 11).
 */
@Controller('manager/rentals')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('manager')
export class ManagerRentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get()
  async findAll(@Query() query: ManagerRentalsQueryDto) {
    const rentals = await this.rentalsService.findAll({
      userId: query.userId,
      libraryId: query.libraryId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
    return rentals.map(toRentalManagerResponse);
  }

  @Patch(':id/status')
  async changeStatus(
    @Param('id', ParseIntPipe) id: ID,
    @Body() dto: ChangeStatusDto,
  ) {
    const rental = await this.rentalsService.changeStatus(id, dto.status);
    return toRentalResponse(rental);
  }
}
