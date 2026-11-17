import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getApiErrorMessage } from '../../api/error';
import { librariesApi, type LibraryListParams } from '../../api/libraries.api';
import type { Library } from '../../types';

export interface LibrariesState {
  items: Library[];
  loading: boolean;
  error: string | null;
}

const initialState: LibrariesState = {
  items: [],
  loading: false,
  error: null,
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
      });
  },
});

export default librariesSlice.reducer;
