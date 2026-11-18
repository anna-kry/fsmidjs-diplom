import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RentalStatus } from '../interfaces/rental-service.interface';

const ALL_STATUSES: RentalStatus[] = [
  'reserved',
  'active',
  'completed',
  'cancelled',
];

/**
 * Фильтры списка собственных аренд клиента (спецификация, раздел 6.4):
 * пагинация + необязательный статус.
 */
export class SearchRentalsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ALL_STATUSES)
  status?: RentalStatus;
}

/**
 * Фильтры списка аренд менеджера: клиентские + userId и libraryId.
 */
export class ManagerRentalsQueryDto extends SearchRentalsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  libraryId?: number;
}
