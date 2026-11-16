import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Параметры списков пользователей:
 * пагинация (limit/offset) + фильтры с частичным совпадением без учёта регистра.
 * Пустая строка по умолчанию означает, что фильтр не задан.
 */
export class SearchUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  email = '';

  @IsOptional()
  @IsString()
  name = '';

  @IsOptional()
  @IsString()
  contactPhone = '';
}
