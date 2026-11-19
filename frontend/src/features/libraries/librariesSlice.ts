import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getApiErrorMessage } from '../../api/error';
import {
  librariesApi,
  type LibraryListParams,
} from '../../api/libraries.api';
import type {
  CreateLibraryInput,
  Library,
  UpdateLibraryInput,
} from '../../types';

export interface LibrariesState {
  items: Library[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  createError: string | null;
  updateLoading: boolean;
  updateError: string | null;
  deleteLoading: boolean;
  deleteError: string | null;
}

const initialState: LibrariesState = {
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
  deleteLoading: false,
  deleteError: null,
};

/** Список библиотек для фильтра на главной странице. */
export const fetchLibraries = createAsyncThunk<
  Library[],
  LibraryListParams,
  { rejectValue: string }
>('libraries/fetchLibraries', async (params, { rejectWithValue }) => {
  try {
    return await librariesApi.fetchLibraries(params);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось загрузить библиотеки'),
    );
  }
});

/** Создание библиотеки (admin). */
export const createLibrary = createAsyncThunk<
  Library,
  CreateLibraryInput,
  { rejectValue: string }
>('libraries/createLibrary', async (data, { rejectWithValue }) => {
  try {
    return await librariesApi.createLibrary(data);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось создать библиотеку'),
    );
  }
});

/** Редактирование библиотеки (admin). */
export const updateLibrary = createAsyncThunk<
  Library,
  { id: number; data: UpdateLibraryInput },
  { rejectValue: string }
>('libraries/updateLibrary', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await librariesApi.updateLibrary(id, data);
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось обновить библиотеку'),
    );
  }
});

/** Удаление библиотеки (admin). */
export const deleteLibrary = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('libraries/deleteLibrary', async (id, { rejectWithValue }) => {
  try {
    await librariesApi.deleteLibrary(id);
    return id;
  } catch (error) {
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось удалить библиотеку'),
    );
  }
});

const librariesSlice = createSlice({
  name: 'libraries',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLibraries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLibraries.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchLibraries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Не удалось загрузить библиотеки';
      })
      .addCase(createLibrary.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createLibrary.fulfilled, (state, action) => {
        state.createLoading = false;
        state.items.push(action.payload);
      })
      .addCase(createLibrary.rejected, (state, action) => {
        state.createLoading = false;
        state.createError =
          action.payload ?? 'Не удалось создать библиотеку';
      })
      .addCase(updateLibrary.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateLibrary.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateLibrary.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError =
          action.payload ?? 'Не удалось обновить библиотеку';
      })
      .addCase(deleteLibrary.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
      })
      .addCase(deleteLibrary.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteLibrary.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError =
          action.payload ?? 'Не удалось удалить библиотеку';
      });
  },
});

export default librariesSlice.reducer;
