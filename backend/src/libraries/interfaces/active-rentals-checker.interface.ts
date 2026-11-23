import { ID } from '../../common/types/id.type';

/**
 * Проверка активных аренд перед удалением книги, библиотеки или связи LibraryBook.
 *
 * Активными считаются аренды со статусом `reserved` или `active`
 * (спецификация, раздел 2, п. 12).
 *
 * Реализация — RentalsService (День 4), подключён в LibrariesModule
 * через токен ACTIVE_RENTALS_CHECKER.
 */
export interface ActiveRentalsChecker {
  hasActiveRentalsForBook(bookId: ID): Promise<boolean>;
  hasActiveRentalsForLibrary(libraryId: ID): Promise<boolean>;
  hasActiveRentalsForLibraryBook(libraryBookId: ID): Promise<boolean>;
}

/** Токен DI для ActiveRentalsChecker. */
export const ACTIVE_RENTALS_CHECKER = 'ACTIVE_RENTALS_CHECKER';
