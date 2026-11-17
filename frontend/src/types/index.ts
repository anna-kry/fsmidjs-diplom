export type ID = number;

export type UserRole = 'client' | 'admin' | 'manager';

export interface User {
  id: ID;
  email: string;
  name: string;
  contactPhone?: string | null;
  role: UserRole;
}

/** Пользователь в списках admin/manager: API не возвращает роль и пароль. */
export interface UserListItem {
  id: ID;
  email: string;
  name: string;
  contactPhone?: string | null;
}

/** Фильтры списков пользователей (частичное совпадение). */
export interface UserFilters {
  email: string;
  name: string;
  contactPhone: string;
}

/** Тело POST /api/admin/users. */
export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  contactPhone?: string;
  role: UserRole;
}

/** Библиотека из API (GET /api/common/libraries). */
export interface Library {
  id: ID;
  name: string;
  address: string;
  description?: string | null;
}

/** Библиотека внутри книги: API возвращает только { id, name, address }. */
export interface BookLibrary {
  id: ID;
  name: string;
  address: string;
}

/** Книга из API (ответ toBookResponse): nullable-поля приходят как null. */
export interface Book {
  id: ID;
  title: string;
  author: string;
  year?: number | null;
  description?: string | null;
  coverImage?: string | null;
  isAvailable: boolean;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  updatedAt: string;
  library?: BookLibrary | null;
}

/** Фильтры поиска книг (GET /api/common/books, раздел 6.3). */
export interface BookFilters {
  library: string;
  author: string;
  title: string;
  availableOnly: boolean;
}

export type RentalStatus = 'reserved' | 'active' | 'completed' | 'cancelled';

export interface BookRental {
  id: ID;
  userId: ID;
  libraryId: ID;
  bookId: ID;
  dateStart: string;
  dateEnd: string;
  status: RentalStatus;
  book?: { id: ID; title: string; author: string };
  library?: { id: ID; name: string };
  user?: { id: ID; name: string; email: string };
}

export interface SupportRequest {
  id: ID;
  user: ID;
  isActive: boolean;
  createdAt: string;
  hasNewMessages?: boolean;
  client?: { id: ID; name: string; email: string; contactPhone?: string };
}

export interface Message {
  id: ID;
  author: ID;
  supportRequest: ID;
  text: string;
  createdAt: string;
  readAt?: string;
  authorInfo?: { id: ID; name: string };
}
