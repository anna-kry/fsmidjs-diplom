import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Максимально допустимый год издания — текущий год. */
const CURRENT_YEAR = new Date().getFullYear();

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
 * Преобразует значение (строку JSON или массив) в массив LibraryCopiesDto
 * с применением трансформаций к каждому элементу.
 */
function transformLibraries(value: unknown): LibraryCopiesDto[] {
  if (value === undefined || value === null || value === '') {
    return undefined as any;
  }
  let arr: unknown[];
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === 'string') {
    try {
      arr = JSON.parse(value);
    } catch {
      return undefined as any;
    }
  } else {
    return undefined as any;
  }
  return arr.map((item: any) => {
    const dto = new LibraryCopiesDto();
    dto.libraryId = toNumber(item.libraryId) ?? 0;
    dto.totalCopies = toNumber(item.totalCopies) ?? 0;
    return dto;
  });
}

/** Библиотека с количеством экземпляров для создания/обновления книги. */
export class LibraryCopiesDto {
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  libraryId: number;

  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  totalCopies: number;
}

/**
 * Создание книги (multipart/form-data, спецификация, раздел 6.3).
 * title, author и libraries (массив с libraryId и totalCopies) обязательны; файл обложки необязателен.
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
  @Max(CURRENT_YEAR)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description: string;

  @Transform(({ value }) => transformLibraries(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LibraryCopiesDto)
  libraries: LibraryCopiesDto[];
}

/** Обновление книги: все поля необязательны. */
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
  @Max(CURRENT_YEAR)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description: string;

  /** Массив библиотек с количеством экземпляров для обновления/добавления. */
  @IsOptional()
  @Transform(({ value }) => transformLibraries(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LibraryCopiesDto)
  libraries?: LibraryCopiesDto[];
}