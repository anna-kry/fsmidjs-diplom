import http from './http';
import type { Book, CreateBookInput, UpdateBookInput } from '../types';

/** Query-параметры поиска книг: пагинация + фильтры (раздел 6.3). */
export interface SearchBooksParams {
  limit: number;
  offset: number;
  library?: string;
  author?: string;
  title?: string;
  availableOnly?: boolean;
}

/** Ответ GET /common/books: страница книг + общее число совпадений. */
export interface SearchBooksResult {
  items: Book[];
  /** Сколько книг вообще подходит под фильтры (для «Найдено: N …»). */
  total: number;
}

export const booksApi = {
  /** Публичный поиск книг: фильтры комбинируются, сортировка — на сервере. */
  async searchBooks(params: SearchBooksParams): Promise<SearchBooksResult> {
    const response = await http.get<SearchBooksResult>('/common/books', {
      params,
    });
    return response.data;
  },

  async fetchBook(id: number): Promise<Book> {
    const response = await http.get<Book>(`/common/books/${id}`);
    return response.data;
  },

  /** Создание книги с обложкой (multipart/form-data, только admin). */
  async createBook(data: CreateBookInput): Promise<Book> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('author', data.author);
    if (data.year !== undefined && data.year !== null) {
      formData.append('year', String(data.year));
    }
    if (data.description !== undefined && data.description !== null) {
      formData.append('description', data.description);
    }
    formData.append('libraryId', String(data.libraryId));
    formData.append('totalCopies', String(data.totalCopies));
    if (data.coverImage) {
      formData.append('coverImage', data.coverImage);
    }
    const response = await http.post<Book>('/admin/books', formData);
    return response.data;
  },

  /** Редактирование книги с обложкой (multipart/form-data, только admin). */
  async updateBook(id: number, data: UpdateBookInput): Promise<Book> {
    const formData = new FormData();
    if (data.title !== undefined && data.title !== null) {
      formData.append('title', data.title);
    }
    if (data.author !== undefined && data.author !== null) {
      formData.append('author', data.author);
    }
    if (data.year !== undefined && data.year !== null) {
      formData.append('year', String(data.year));
    }
    if (data.description !== undefined && data.description !== null) {
      formData.append('description', data.description);
    }
    if (data.libraryId !== undefined && data.libraryId !== null) {
      formData.append('libraryId', String(data.libraryId));
    }
    if (data.totalCopies !== undefined && data.totalCopies !== null) {
      formData.append('totalCopies', String(data.totalCopies));
    }
    if (data.coverImage) {
      formData.append('coverImage', data.coverImage);
    }
    const response = await http.put<Book>(`/admin/books/${id}`, formData);
    return response.data;
  },

  /** Удаление книги (только admin). */
  async deleteBook(id: number): Promise<void> {
    await http.delete(`/admin/books/${id}`);
  },
};
