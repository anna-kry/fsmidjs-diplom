import http from './http';
import type { Library } from '../types';

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
};
