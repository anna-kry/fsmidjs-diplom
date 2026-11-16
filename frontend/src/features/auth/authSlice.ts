import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import {
  authApi,
  type LoginInput,
  type RegisterInput,
  type RegisterResult,
} from '../../api/auth.api';
import { getApiErrorMessage } from '../../api/error';
import type { User } from '../../types';

export interface AuthState {
  /** Текущий пользователь или null, если это гость. */
  user: User | null;
  /** Идёт запрос (первичная проверка сессии, вход, регистрация, выход). */
  loading: boolean;
  /** Сообщение об ошибке последней операции. */
  error: string | null;
  /** Первичная проверка сессии завершена — можно показывать маршруты. */
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  initialized: false,
};

/** Восстановление сессии после перезагрузки страницы. */
export const fetchMe = createAsyncThunk<
  User | null,
  void,
  { rejectValue: string }
>('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch (error) {
    // 401 — сессии нет, это обычный сценарий для гостя, а не ошибка.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось проверить сессию'),
    );
  }
});

export const login = createAsyncThunk<User, LoginInput, { rejectValue: string }>(
  'auth/login',
  async (data, { rejectWithValue }) => {
    try {
      return await authApi.login(data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return rejectWithValue('Неверный email или пароль');
      }
      return rejectWithValue(getApiErrorMessage(error, 'Не удалось войти'));
    }
  },
);

export const register = createAsyncThunk<
  RegisterResult,
  RegisterInput,
  { rejectValue: string }
>('auth/register', async (data, { rejectWithValue }) => {
  try {
    return await authApi.register(data);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось зарегистрироваться'),
    );
  }
});

/** Выход: сессия удаляется на сервере, состояние очищается даже при ошибке сети. */
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch {
    // Локальный выход выполняется в любом случае.
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Ошибка очищается при открытии страниц входа и регистрации. */
    clearError(state) {
      state.error = null;
    },
    /** Сервер ответил 401 на защищённый запрос: сессия больше не действительна. */
    sessionExpired(state) {
      state.user = null;
      state.initialized = true;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.initialized = true;
        state.loading = false;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        // Даже при ошибке проверка завершена, иначе страница навсегда останется на loader.
        state.initialized = true;
        state.loading = false;
        state.error = action.payload ?? 'Не удалось проверить сессию';
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Не удалось войти';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Не удалось зарегистрироваться';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearError, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
