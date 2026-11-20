import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { getApiErrorMessage } from '../../api/error';
import {
  rentalsApi,
  type ChangeableRentalStatus,
  type CreateRentalInput,
  type ManagerRentalListParams,
  type RentalListParams,
} from '../../api/rentals.api';
import { sessionExpired } from '../auth/authSlice';
import type { BookRental } from '../../types';

export interface RentalsState {
  /** Список аренд (свои у клиента, все у менеджера). */
  items: BookRental[];
  loading: boolean;
  error: string | null;
  /** Идёт создание брони. */
  createLoading: boolean;
  createError: string | null;
  /** Идёт отмена брони клиентом. */
  cancelLoading: boolean;
  cancelError: string | null;
  /** Идёт смена статуса менеджером. */
  statusLoading: boolean;
  statusError: string | null;
}

const initialState: RentalsState = {
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  cancelLoading: false,
  cancelError: null,
  statusLoading: false,
  statusError: null,
};

/**
 * Сообщение об ошибке аренды: сначала понятный текст сервера,
 * а если он стандартный («Unauthorized»/«Forbidden») — свой текст
 * по коду ответа (раздел 6.4: 400, 401, 403, 404, 409).
 */
function rentalErrorMessage(error: unknown, fallback: string): string {
  const message = getApiErrorMessage(error, '');
  if (message) return message;

  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 400:
        return 'Некорректные данные бронирования';
      case 401:
        return 'Сессия истекла, войдите заново';
      case 403:
        return 'Нет доступа к этой брони';
      case 404:
        return 'Книга или библиотека не найдена';
      case 409:
        return 'На выбранные даты нет свободных экземпляров книги';
    }
  }

  return fallback;
}

/** Создание брони (только client, раздел 6.4). */
export const createRental = createAsyncThunk<
  BookRental,
  CreateRentalInput,
  { rejectValue: string }
>('rentals/createRental', async (data, { dispatch, rejectWithValue }) => {
  try {
    return await rentalsApi.createRental(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      rentalErrorMessage(error, 'Не удалось создать бронь'),
    );
  }
});

/** Список моих аренд (client). */
export const fetchMyRentals = createAsyncThunk<
  BookRental[],
  RentalListParams,
  { rejectValue: string }
>('rentals/fetchMyRentals', async (params, { dispatch, rejectWithValue }) => {
  try {
    return await rentalsApi.fetchMyRentals(params);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      rentalErrorMessage(error, 'Не удалось загрузить ваши брони'),
    );
  }
});

/** Отмена своей брони клиентом. */
export const cancelRental = createAsyncThunk<
  BookRental,
  number,
  { rejectValue: string }
>('rentals/cancelRental', async (id, { dispatch, rejectWithValue }) => {
  try {
    return await rentalsApi.cancelRental(id);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(rentalErrorMessage(error, 'Не удалось отменить бронь'));
  }
});

/** Список всех аренд (manager). */
export const fetchManagerRentals = createAsyncThunk<
  BookRental[],
  ManagerRentalListParams,
  { rejectValue: string }
>('rentals/fetchManagerRentals', async (params, { dispatch, rejectWithValue }) => {
  try {
    return await rentalsApi.fetchManagerRentals(params);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      rentalErrorMessage(error, 'Не удалось загрузить аренды'),
    );
  }
});

/** Смена статуса аренды менеджером. */
export const changeRentalStatus = createAsyncThunk<
  BookRental,
  { id: number; status: ChangeableRentalStatus },
  { rejectValue: string }
>('rentals/changeRentalStatus', async ({ id, status }, { dispatch, rejectWithValue }) => {
  try {
    return await rentalsApi.changeRentalStatus(id, status);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      rentalErrorMessage(error, 'Не удалось изменить статус аренды'),
    );
  }
});

/** Обновляет одну аренду в списке после ответа сервера (без повторной загрузки). */
function patchRental(state: RentalsState, payload: BookRental) {
  const index = state.items.findIndex((item) => item.id === payload.id);
  if (index !== -1) {
    // Ответ на отмену/смену статуса не содержит book/library/user —
    // сохраняем то, что уже было в списке, и обновляем поля брони.
    state.items[index] = { ...state.items[index], ...payload };
  }
}

const rentalsSlice = createSlice({
  name: 'rentals',
  initialState,
  reducers: {
    /** Ошибки действий (создание, отмена, смена статуса) очищаются при открытии страниц. */
    clearRentalActionErrors(state) {
      state.createError = null;
      state.cancelError = null;
      state.statusError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- Списки ----
      .addCase(fetchMyRentals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyRentals.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchMyRentals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Не удалось загрузить ваши брони';
      })
      .addCase(fetchManagerRentals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchManagerRentals.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchManagerRentals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Не удалось загрузить аренды';
      })
      // ---- Создание ----
      .addCase(createRental.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createRental.fulfilled, (state) => {
        state.createLoading = false;
      })
      .addCase(createRental.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload ?? 'Не удалось создать бронь';
      })
      // ---- Отмена клиентом ----
      .addCase(cancelRental.pending, (state) => {
        state.cancelLoading = true;
        state.cancelError = null;
      })
      .addCase(cancelRental.fulfilled, (state, action) => {
        state.cancelLoading = false;
        patchRental(state, action.payload);
      })
      .addCase(cancelRental.rejected, (state, action) => {
        state.cancelLoading = false;
        state.cancelError = action.payload ?? 'Не удалось отменить бронь';
      })
      // ---- Смена статуса менеджером ----
      .addCase(changeRentalStatus.pending, (state) => {
        state.statusLoading = true;
        state.statusError = null;
      })
      .addCase(changeRentalStatus.fulfilled, (state, action) => {
        state.statusLoading = false;
        patchRental(state, action.payload);
      })
      .addCase(changeRentalStatus.rejected, (state, action) => {
        state.statusLoading = false;
        state.statusError =
          action.payload ?? 'Не удалось изменить статус аренды';
      });
  },
});

export const { clearRentalActionErrors } = rentalsSlice.actions;
export default rentalsSlice.reducer;
