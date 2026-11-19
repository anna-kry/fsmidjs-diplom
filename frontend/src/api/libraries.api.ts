import http from './http';
import type { CreateLibraryInput, Library, UpdateLibraryInput } from '../types';

/** Query-параметры списка библиотек (пагинация, раздел 6.3). */
export interface LibraryListParams {
  limit: number;
  offset: number;
}

export const librariesApi = {
  /** Публичный список библиотек — для фильтра на главной странице. */
  async fetchLibraries(params: LibraryListParams): Promise<Library[]> {
    const response = await http.get<Library[]>('/common/libraries', { params });
    return response.data;
  },

  async fetchLibrary(id: number): Promise<Library> {
    const response = await http.get<Library>(`/common/libraries/${id}`);
    return response.data;
  },

  /** Создание библиотеки (только admin). */
  async createLibrary(data: CreateLibraryInput): Promise<Library> {
    const response = await http.post<Library>('/admin/libraries', data);
    return response.data;
  },

  /** Редактирование библиотеки (только admin). */
  async updateLibrary(id: number, data: UpdateLibraryInput): Promise<Library> {
    const response = await http.put<Library>(`/admin/libraries/${id}`, data);
    return response.data;
  },

  /** Удаление библиотеки (только admin). */
  async deleteLibrary(id: number): Promise<void> {
    await http.delete(`/admin/libraries/${id}`);
  },
};
