import { ID } from '../../common/types/id.type';

/**
 * Проверка активных аренд перед удалением книги или библиотеки.
 *
 * Активными считаются аренды со статусом `reserved` или `active`
 * (спецификация, раздел 2, п. 12).
 *
 * На Дне 3 реализация — заглушка (NoActiveRentalsChecker): модуль аренды
 * ещё не существует. На Дне 4 этот токен подключается к RentalsService.
 */
export interface ActiveRentalsChecker {
  hasActiveRentalsForBook(bookId: ID): Promise<boolean>;
  hasActiveRentalsForLibrary(libraryId: ID): Promise<boolean>;
}

/** Токен DI для ActiveRentalsChecker. */
export const ACTIVE_RENTALS_CHECKER = 'ACTIVE_RENTALS_CHECKER';
