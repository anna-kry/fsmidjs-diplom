import { Transform } from 'class-transformer';
import { IsInt, Matches, Min } from 'class-validator';

/** Формат даты аренды: YYYY-MM-DD (спецификация, раздел 2, п. 10). */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_FORMAT_MESSAGE = 'Дата должна быть в формате YYYY-MM-DD';

/**
 * Создание брони (спецификация, раздел 6.4).
 * Правила дат (прошлое, порядок, длительность ≤ 30 дней) проверяет сервис.
 */
export class CreateRentalDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  bookId: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  libraryId: number;

  @Matches(DATE_PATTERN, { message: DATE_FORMAT_MESSAGE })
  dateStart: string;

  @Matches(DATE_PATTERN, { message: DATE_FORMAT_MESSAGE })
  dateEnd: string;
}
