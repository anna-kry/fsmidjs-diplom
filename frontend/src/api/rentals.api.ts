import http from './http';
import type { BookRental, RentalStatus } from '../types';

/** Тело POST /api/client/rentals (раздел 6.4). Даты — YYYY-MM-DD. */
export interface CreateRentalInput {
  bookId: number;
  libraryId: number;
  dateStart: string;
  dateEnd: string;
}

/** Параметры списка аренд: пагинация + необязательный статус. */
export interface RentalListParams {
  limit: number;
  offset: number;
  status?: RentalStatus;
}

/** Параметры списка аренд менеджера: клиентские + userId и libraryId. */
export interface ManagerRentalListParams extends RentalListParams {
  userId?: number;
  libraryId?: number;
}

/** Статусы, которые менеджер может указать в PATCH (без reserved). */
export type ChangeableRentalStatus = Exclude<RentalStatus, 'reserved'>;

export const rentalsApi = {
  /** Создать бронь (только client). */
  async createRental(data: CreateRentalInput): Promise<BookRental> {
    const response = await http.post<BookRental>('/client/rentals', data);
    return response.data;
  },

  /** Мои брони (только client). */
  async fetchMyRentals(params: RentalListParams): Promise<BookRental[]> {
    const response = await http.get<BookRental[]>('/client/rentals', {
      params,
    });
    return response.data;
  },

  /** Отменить свою бронь в статусе reserved (DELETE /client/rentals/:id). */
  async cancelRental(id: number): Promise<BookRental> {
    const response = await http.delete<BookRental>(`/client/rentals/${id}`);
    return response.data;
  },

  /** Все аренды с фильтрами (только manager). */
  async fetchManagerRentals(
    params: ManagerRentalListParams,
  ): Promise<BookRental[]> {
    const response = await http.get<BookRental[]>('/manager/rentals', {
      params,
    });
    return response.data;
  },

  /** Смена статуса аренды (PATCH /manager/rentals/:id/status). */
  async changeRentalStatus(
    id: number,
    status: ChangeableRentalStatus,
  ): Promise<BookRental> {
    const response = await http.patch<BookRental>(
      `/manager/rentals/${id}/status`,
      { status },
    );
    return response.data;
  },
};
