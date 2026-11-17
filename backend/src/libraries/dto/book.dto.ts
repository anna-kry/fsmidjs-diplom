import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Преобразует строковые значения multipart-формы в число.
 * Пустая строка трактуется как отсутствие поля (для необязательных полей).
 */
function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return Number(value);
}

/**
 * Создание книги (multipart/form-data, спецификация, раздел 6.3).
 * title, author, libraryId и totalCopies обязательны; файл обложки необязателен.
 */
export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  author: string;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1000)
  @Max(2100)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description: string;

  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  libraryId: number;

  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  totalCopies: number;
}

/** Обновление книги: все поля необязательны, при смене totalCopies пересчитываются счётчики. */
export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  author: string;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1000)
  @Max(2100)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  libraryId: number;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  totalCopies: number;
}
