import { BookRental } from './entities/book-rental.entity';
import { RentalStatus } from './interfaces/rental-service.interface';

/** Книга в ответе аренды: сокращённый набор полей (раздел 6.4). */
export interface RentalBookResponse {
  id: number;
  title: string;
  author: string;
}

/** Библиотека в ответе аренды. */
export interface RentalLibraryResponse {
  id: number;
  name: string;
}

/** Пользователь в ответе аренды (для менеджера). */
export interface RentalUserResponse {
  id: number;
  name: string;
  email: string;
}

/** Базовый ответ аренды: поля самой брони. */
export interface RentalResponse {
  id: number;
  userId: number;
  libraryId: number;
  bookId: number;
  dateStart: string;
  dateEnd: string;
  status: RentalStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Аренда в списке: бронь + связанные сущности. */
export interface RentalListResponse extends RentalResponse {
  book: RentalBookResponse | null;
  library: RentalLibraryResponse | null;
  /** Для менеджера: автор брони (спецификация, раздел 6.4). */
  user?: RentalUserResponse | null;
}

/**
 * Ответ для создания, смены статуса и отмены: сама бронь
 * (спецификация, раздел 6.4: 201/200 `BookRental`).
 */
export function toRentalResponse(rental: BookRental): RentalResponse {
  return {
    id: rental.id,
    userId: rental.userId,
    libraryId: rental.libraryId,
    bookId: rental.bookId,
    dateStart: rental.dateStart,
    dateEnd: rental.dateEnd,
    status: rental.status,
    createdAt: rental.createdAt,
    updatedAt: rental.updatedAt,
  };
}

/** Ответ в списке: бронь + книга + библиотека (для клиента). */
export function toRentalListResponse(rental: BookRental): RentalListResponse {
  return {
    ...toRentalResponse(rental),
    book: rental.book
      ? {
          id: rental.book.id,
          title: rental.book.title,
          author: rental.book.author,
        }
      : null,
    library: rental.library
      ? { id: rental.library.id, name: rental.library.name }
      : null,
  };
}

/** Ответ в списке менеджера: то же + пользователь. */
export function toRentalManagerResponse(rental: BookRental): RentalListResponse {
  return {
    ...toRentalListResponse(rental),
    user: rental.user
      ? { id: rental.user.id, name: rental.user.name, email: rental.user.email }
      : null,
  };
}
