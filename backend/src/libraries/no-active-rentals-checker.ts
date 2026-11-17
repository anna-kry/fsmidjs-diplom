import { Injectable } from '@nestjs/common';
import { ID } from '../common/types/id.type';
import { ActiveRentalsChecker } from './interfaces/active-rentals-checker.interface';

/**
 * Заглушка проверки активных аренд (День 3).
 *
 * Модуль аренды ещё не реализован, поэтому всегда считаем, что активных
 * аренд нет. На Дне 4 класс заменяется на RentalsService через
 * токен ACTIVE_RENTALS_CHECKER без изменения книг и библиотек.
 */
@Injectable()
export class NoActiveRentalsChecker implements ActiveRentalsChecker {
  async hasActiveRentalsForBook(_bookId: ID): Promise<boolean> {
    return false;
  }

  async hasActiveRentalsForLibrary(_libraryId: ID): Promise<boolean> {
    return false;
  }
}
