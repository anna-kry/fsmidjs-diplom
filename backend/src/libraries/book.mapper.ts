import { Book } from './entities/book.entity';

/** Библиотека в ответе API: только публичные поля (спецификация, раздел 6.3). */
export interface BookLibraryResponse {
  id: number;
  name: string;
  address: string;
}

/** Ответ API для книги: без внутренних полей, с связанной библиотекой. */
export interface BookResponse {
  id: number;
  title: string;
  author: string;
  year: number;
  description: string;
  coverImage: string;
  isAvailable: boolean;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
  library: BookLibraryResponse | null;
}

/**
 * Преобразует сущность книги в ответ API.
 * Библиотека сокращается до `{ id, name, address }` — так задано в контракте,
 * а явный список полей не даст утечь внутренним полям в будущем.
 */
export function toBookResponse(book: Book): BookResponse {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    description: book.description,
    coverImage: book.coverImage,
    isAvailable: book.isAvailable,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    library: book.library
      ? {
          id: book.library.id,
          name: book.library.name,
          address: book.library.address,
        }
      : null,
  };
}
