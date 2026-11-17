import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Параметры поиска книг (спецификация, раздел 6.3):
 * пагинация + фильтры library, author, title, availableOnly.
 *
 * `library` — id библиотеки (цифры) или частичное совпадение её названия.
 * `title` и `author` — частичное совпадение без учёта регистра.
 */
export class SearchBooksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  library = '';

  @IsOptional()
  @IsString()
  author = '';

  @IsOptional()
  @IsString()
  title = '';

  // availableOnly=true — только книги, у которых есть свободные экземпляры.
  @Transform(({ value }) => value === 'true' || value === '1')
  @IsBoolean()
  availableOnly = false;
}
