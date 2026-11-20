import type { RentalStatus } from '../types';

/**
 * Значения фильтров списка аренд менеджера (строки — как в форме).
 * Пустая строка означает «не задано».
 */
export interface ManagerRentalsFilters {
  userId: string;
  libraryId: string;
  status: '' | RentalStatus;
}

/** Пустые фильтры — «все аренды». */
export const EMPTY_MANAGER_RENTALS_FILTERS: ManagerRentalsFilters = {
  userId: '',
  libraryId: '',
  status: '',
};

/** Подписи статусов аренды для списков и фильтров.
 * Значения — из backend (спецификация, раздел 2, п. 11).
 */
export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  reserved: 'Забронирована',
  active: 'Выдана',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

/** Порядок статусов в фильтрах и подписях. */
export const RENTAL_STATUSES: RentalStatus[] = [
  'reserved',
  'active',
  'completed',
  'cancelled',
];

/**
 * Допустимые переходы статусов (спецификация, раздел 2, п. 11).
 * Дублирует таблицу из backend-сервиса: менеджеру показываем только
 * те варианты, которые сервер согласится принять.
 */
export const RENTAL_STATUS_TRANSITIONS: Record<RentalStatus, RentalStatus[]> = {
  reserved: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** Локальная дата «сегодня» в формате YYYY-MM-DD (для полей type="date"). */
export function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Разница между датами YYYY-MM-DD в днях (без учёта часовых поясов). */
export function daysBetween(dateStart: string, dateEnd: string): number {
  const parse = (value: string): number => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(dateEnd) - parse(dateStart)) / 86_400_000);
}

/** Дата YYYY-MM-DD → ДД.ММ.ГГГГ для показа в таблицах. */
export function formatRentalDate(value: string): string {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}.${month}.${year}` : value;
}

/** Максимальная длительность брони в днях (спецификация, раздел 2, п. 10). */
export const MAX_RENTAL_DAYS = 30;

/**
 * Проверка дат брони на клиенте — повторяет правила backend
 * (спецификация, раздел 2, п. 10): начало не в прошлом, конец не раньше
 * начала, длительность ≤ 30 дней. Возвращает текст ошибки или null.
 */
export function validateRentalDates(
  dateStart: string,
  dateEnd: string,
): string | null {
  if (!dateStart || !dateEnd) {
    return 'Укажите даты начала и окончания аренды';
  }
  if (dateStart < todayString()) {
    return 'Дата начала не может быть раньше сегодняшнего дня';
  }
  if (dateEnd < dateStart) {
    return 'Дата окончания не может быть раньше даты начала';
  }
  if (daysBetween(dateStart, dateEnd) > MAX_RENTAL_DAYS) {
    return `Максимальная длительность брони — ${MAX_RENTAL_DAYS} дней`;
  }
  return null;
}
