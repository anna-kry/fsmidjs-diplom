import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { booksApi, type SearchBooksParams } from '../../api/books.api';
import { getApiErrorMessage } from '../../api/error';
import type { Book } from '../../types';

export interface BooksState {
  items: Book[];
  loading: boolean;
  error: string | null;
  /**
   * requestId последнего запроса поиска.
   * При быстрых изменениях фильтров устаревший ответ (rejected или fulfilled)
   * игнорируется, чтобы не перезаписать более свежий результат.
   */
  requestId: string | null;
}

const initialState: BooksState = {
  items: [],
  loading: false,
  error: null,
  requestId: null,
};

/** Публичный поиск книг с фильтрами и пагинацией. */
export const searchBooks = createAsyncThunk<
  Book[],
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
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(searchBooks.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.error = action.payload ?? 'Не удалось выполнить поиск книг';
      });
  },
});

export default booksSlice.reducer;
