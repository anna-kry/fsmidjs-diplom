import { IsIn } from 'class-validator';

/**
 * Смена статуса менеджером (спецификация, раздел 6.4).
 * `reserved` не указывается: бронь создаётся сразу в этом статусе.
 */
export class ChangeStatusDto {
  @IsIn(['active', 'completed', 'cancelled'])
  status: 'active' | 'completed' | 'cancelled';
}
