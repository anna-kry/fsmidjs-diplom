/**
 * Экранирует специальные символы пользовательского ввода
 * для безопасного использования в LIKE/ILIKE-запросах PostgreSQL.
 * Экранируются: \, % и _ (скобочный символ по умолчанию — обратный слэш).
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
