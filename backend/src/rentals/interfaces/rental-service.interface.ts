import { ID } from '../../common/types/id.type';
import { BookRental } from '../entities/book-rental.entity';

/** Статусы аренды (спецификация, раздел 4). */
export type RentalStatus = 'reserved' | 'active' | 'completed' | 'cancelled';

/** Параметры поиска аренд. */
export interface FindRentalsParams {
  userId?: ID;
  libraryId?: ID;
  status?: RentalStatus;
  limit: number;
  offset: number;
}

/** Параметры поиска собственных аренд клиента. */
export interface FindUserRentalsParams {
  status?: RentalStatus;
  limit: number;
  offset: number;
}

/** Тело создания брони (спецификация, раздел 5, IRentalService). */
export interface CreateRentalData {
  bookId: ID;
  libraryId: ID;
  dateStart: string;
  dateEnd: string;
}

/**
 * Сервис аренды (спецификация, раздел 5).
 *
 * Правила переходов статусов и счётчиков — раздел 2, пп. 9–11:
 * - создание: статус `reserved`, счётчики книги не меняются;
 * - `reserved → active`: availableCopies −1;
 * - `active → completed` и `active → cancelled`: availableCopies +1;
 * - `reserved → cancelled`: без изменения счётчиков;
 * - прочие переходы — 400.
 */
export interface IRentalService {
  create(userId: ID, dto: CreateRentalData): Promise<BookRental>;
  findByUser(
    userId: ID,
    params: FindUserRentalsParams,
  ): Promise<BookRental[]>;
  findAll(params: FindRentalsParams): Promise<BookRental[]>;
  cancelByClient(rentalId: ID, userId: ID): Promise<BookRental>;
  changeStatus(rentalId: ID, status: RentalStatus): Promise<BookRental>;
}
