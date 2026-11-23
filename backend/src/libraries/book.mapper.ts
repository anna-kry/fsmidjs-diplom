import { Book } from './entities/book.entity';
import { LibraryBook } from './entities/library-book.entity';

/** Библиотека в ответе API: только публичные поля. */
export interface BookLibraryResponse {
  id: number;
  name: string;
  address: string;
}

/** Информация о доступности книги в конкретной библиотеке. */
export interface BookAvailabilityResponse {
  library: BookLibraryResponse;
  totalCopies: number;
  availableCopies: number;
  isAvailable: boolean;
}

/** Ответ API для книги: без внутренних полей, с доступностью по библиотекам. */
export interface BookResponse {
  id: number;
  title: string;
  author: string;
  year: number;
  description: string;
  coverImage: string;
  createdAt: Date;
  updatedAt: Date;
  availability: BookAvailabilityResponse[];
}

/**
 * Преобразует сущность книги в ответ API.
 */
export function toBookResponse(book: Book): BookResponse {
  const availability: BookAvailabilityResponse[] = (
    book.libraryBooks ?? []
  ).map((lb: LibraryBook) => ({
    library: lb.library
      ? {
          id: lb.library.id,
          name: lb.library.name,
          address: lb.library.address,
        }
      : null!,
    totalCopies: lb.totalCopies,
    availableCopies: lb.availableCopies,
    isAvailable: lb.availableCopies > 0,
  }));

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    description: book.description,
    coverImage: book.coverImage,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    availability,
  };
}