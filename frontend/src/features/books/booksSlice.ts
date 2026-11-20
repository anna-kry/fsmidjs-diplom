import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  booksApi,
  type SearchBooksParams,
  type SearchBooksResult,
} from '../../api/books.api';
import { getApiErrorMessage } from '../../api/error';
import type {
  Book,
  CreateBookInput,
  UpdateBookInput,
} from '../../types';

export interface BooksState {
  items: Book[];
  /** Общее число книг из последнего поиска (для «Найдено: N …»). */
  total: number;
  loading: boolean;
  error: string | null;
  requestId: string | null;
  createLoading: boolean;
  createError: string | null;
  updateLoading: boolean;
  updateError: string | null;
  deleteLoading: boolean;
  deleteError: string | null;
}

const initialState: BooksState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  requestId: null,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
  deleteLoading: false,
  deleteError: null,
};

/** Публичный поиск книг с фильтрами и пагинацией. */
export const searchBooks = createAsyncThunk<
  SearchBooksResult,
  SearchBooksParams,
  { rejectValue: string }
>('books/searchBooks', async (params, { rejectWithValue }) => {
  try {
    return await booksApi.searchBooks(params);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось выполнить поиск книг'),
    );
  }
});

/** Получение одной книги по id. */
export const fetchBook = createAsyncThunk<
  Book,
  number,
  { rejectValue: string }
>('books/fetchBook', async (id, { rejectWithValue }) => {
  try {
    return await booksApi.fetchBook(id);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось загрузить книгу'),
    );
  }
});

/** Создание книги (admin). */
export const createBook = createAsyncThunk<
  Book,
  CreateBookInput,
  { rejectValue: string }
>('books/createBook', async (data, { rejectWithValue }) => {
  try {
    return await booksApi.createBook(data);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось создать книгу'),
    );
  }
});

/** Редактирование книги (admin). */
export const updateBook = createAsyncThunk<
  Book,
  { id: number; data: UpdateBookInput },
  { rejectValue: string }
>('books/updateBook', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await booksApi.updateBook(id, data);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось обновить книгу'),
    );
  }
});

/** Удаление книги (admin). */
export const deleteBook = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('books/deleteBook', async (id, { rejectWithValue }) => {
  try {
    await booksApi.deleteBook(id);
    return id;
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось удалить книгу'),
    );
  }
});

const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(searchBooks.pending, (state, action) => {
        state.requestId = action.meta.requestId;
        state.loading = true;
        state.error = null;
      })
      .addCase(searchBooks.fulfilled, (state, action) => {
        // Ответ устаревшего запроса — просто игнорируем.
        if (state.requestId !== action.meta.requestId) {
          return;
        }
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.loading = false;
      })
      .addCase(searchBooks.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.error = action.payload ?? 'Не удалось выполнить поиск книг';
      })
      .addCase(fetchBook.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBook.fulfilled, (state, action) => {
        state.loading = false;
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchBook.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Не удалось загрузить книгу';
      })
      .addCase(createBook.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createBook.fulfilled, (state, action) => {
        state.createLoading = false;
        state.items.push(action.payload);
      })
      .addCase(createBook.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload ?? 'Не удалось создать книгу';
      })
      .addCase(updateBook.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateBook.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateBook.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload ?? 'Не удалось обновить книгу';
      })
      .addCase(deleteBook.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
      })
      .addCase(deleteBook.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteBook.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload ?? 'Не удалось удалить книгу';
      });
  },
});

export default booksSlice.reducer;
