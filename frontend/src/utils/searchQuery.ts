import type { BookFilters } from '../types';

/**
 * Фильтры поиска живут в query-параметрах адреса (/search?title=…):
 * их видно в адресной строке, страницу можно обновить (F5) и скопировать
 * ссылку. Эти две функции — единственное место, где параметры собираются
 * и разбираются.
 */

/** Собирает query-строку из фильтров: пустые значения опускаются. */
export function buildSearchQuery(filters: BookFilters): string {
  const params = new URLSearchParams();
  if (filters.library) {
    params.set('library', filters.library);
  }
  if (filters.author) {
    params.set('author', filters.author);
  }
  if (filters.title) {
    params.set('title', filters.title);
  }
  if (filters.availableOnly) {
    params.set('availableOnly', 'true');
  }
  return params.toString();
}

/** Разбирает query-строку адреса в фильтры поиска. */
export function parseSearchQuery(search: string): BookFilters {
  const params = new URLSearchParams(search);
  return {
    library: params.get('library') ?? '',
    author: params.get('author') ?? '',
    title: params.get('title') ?? '',
    availableOnly: params.get('availableOnly') === 'true',
  };
}
