import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { getApiErrorMessage } from '../../api/error';
import { usersApi, type UserListParams } from '../../api/users.api';
import { sessionExpired } from '../auth/authSlice';
import type { CreateUserInput, User, UserListItem } from '../../types';

/** Источник списка: admin и manager читают пользователей из разных эндпоинтов. */
export type UsersSource = 'admin' | 'manager';

export interface UsersState {
  items: UserListItem[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  createError: string | null;
}

const initialState: UsersState = {
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
};

export const fetchUsers = createAsyncThunk<
  UserListItem[],
  { source: UsersSource } & UserListParams,
  { rejectValue: string }
>('users/fetchUsers', async (params, { dispatch, rejectWithValue }) => {
  try {
    const { source, ...query } = params;
    if (source === 'admin') {
      return await usersApi.fetchAdminUsers(query);
    }
    return await usersApi.fetchManagerUsers(query);
  } catch (error) {
    // Истёкшая сессия: чистим пользователя, маршруты сами уведут на /login.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось загрузить пользователей'),
    );
  }
});

export const createAdminUser = createAsyncThunk<
  User,
  CreateUserInput,
  { rejectValue: string }
>('users/createAdminUser', async (data, { dispatch, rejectWithValue }) => {
  try {
    return await usersApi.createAdminUser(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось создать пользователя'),
    );
  }
});

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Не удалось загрузить пользователей';
      })
      .addCase(createAdminUser.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createAdminUser.fulfilled, (state) => {
        state.createLoading = false;
      })
      .addCase(createAdminUser.rejected, (state, action) => {
        state.createLoading = false;
        state.createError =
          action.payload ?? 'Не удалось создать пользователя';
      });
  },
});

export default usersSlice.reducer;
