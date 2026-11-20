import { describe, expect, it } from 'vitest';
import {
  MAX_RENTAL_DAYS,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_TRANSITIONS,
  daysBetween,
  formatRentalDate,
  todayString,
  validateRentalDates,
} from './rentals';

/** Дата со сдвигом в днях от сегодня (для проверок границ). */
function shiftDate(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('validateRentalDates: проверка дат брони', () => {
  it('пустые даты — ошибка', () => {
    expect(validateRentalDates('', '')).toBe(
      'Укажите даты начала и окончания аренды',
    );
  });

  it('дата начала в прошлом — ошибка', () => {
    expect(validateRentalDates(shiftDate(-1), shiftDate(-1))).toBe(
      'Дата начала не может быть раньше сегодняшнего дня',
    );
  });

  it('окончание раньше начала — ошибка', () => {
    const start = shiftDate(2);
    const end = shiftDate(1);
    expect(validateRentalDates(start, end)).toBe(
      'Дата окончания не может быть раньше даты начала',
    );
  });

  it('длительность больше 30 дней — ошибка', () => {
    expect(validateRentalDates(shiftDate(0), shiftDate(MAX_RENTAL_DAYS + 1))).toBe(
      `Максимальная длительность брони — ${MAX_RENTAL_DAYS} дней`,
    );
  });

  it('ровно 30 дней — допустимо', () => {
    expect(validateRentalDates(shiftDate(0), shiftDate(MAX_RENTAL_DAYS))).toBeNull();
  });

  it('одна и та же дата (сегодня) — допустимо', () => {
    expect(validateRentalDates(todayString(), todayString())).toBeNull();
  });
});

describe('daysBetween: разница дат', () => {
  it('считает дни без часовых поясов', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-05-05', '2026-05-05')).toBe(0);
  });
});

describe('formatRentalDate: отображение дат', () => {
  it('переводит YYYY-MM-DD в ДД.ММ.ГГГГ', () => {
    expect(formatRentalDate('2026-11-20')).toBe('20.11.2026');
    expect(formatRentalDate('2026-01-05')).toBe('05.01.2026');
  });

  it('неправильную строку возвращает как есть', () => {
    expect(formatRentalDate('не дата')).toBe('не дата');
  });
});

describe('RENTAL_STATUS_TRANSITIONS: допустимые переходы статусов', () => {
  it('reserved → только active и cancelled', () => {
    expect(RENTAL_STATUS_TRANSITIONS.reserved).toEqual(['active', 'cancelled']);
  });

  it('active → только completed и cancelled', () => {
    expect(RENTAL_STATUS_TRANSITIONS.active).toEqual(['completed', 'cancelled']);
  });

  it('completed и cancelled — терминальные статусы', () => {
    expect(RENTAL_STATUS_TRANSITIONS.completed).toEqual([]);
    expect(RENTAL_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it('для каждого статуса есть подпись', () => {
    expect(Object.keys(RENTAL_STATUS_LABELS)).toEqual([
      'reserved',
      'active',
      'completed',
      'cancelled',
    ]);
  });
});
