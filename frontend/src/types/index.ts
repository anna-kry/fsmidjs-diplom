export type ID = number;

export type UserRole = 'client' | 'admin' | 'manager';

export interface User {
  id: ID;
  email: string;
  name: string;
  contactPhone?: string;
  role: UserRole;
}

export interface Library {
  id: ID;
  name: string;
  address: string;
  description?: string;
}

export interface Book {
  id: ID;
  libraryId: ID;
  title: string;
  author: string;
  year?: number;
  description?: string;
  coverImage?: string;
  isAvailable: boolean;
  totalCopies: number;
  availableCopies: number;
  library?: Library;
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
