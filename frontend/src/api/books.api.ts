import http from './http';
import type { Book } from '../types';

/** Query-параметры поиска книг: пагинация + фильтры (раздел 6.3). */
export interface SearchBooksParams {
  limit: number;
  offset: number;
  library?: string;
  author?: string;
  title?: string;
  availableOnly?: boolean;
}

export const booksApi = {
  /** Публичный поиск книг: фильтры комбинируются, сортировка — на сервере. */
  async searchBooks(params: SearchBooksParams): Promise<Book[]> {
    const response = await http.get<Book[]>('/common/books', { params });
    return response.data;
  },

  async fetchBook(id: number): Promise<Book> {
    const response = await http.get<Book>(`/common/books/${id}`);
    return response.data;
  },
};
