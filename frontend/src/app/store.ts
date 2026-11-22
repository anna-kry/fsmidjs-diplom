import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice';
import librariesReducer from '../features/libraries/librariesSlice';
import booksReducer from '../features/books/booksSlice';
import rentalsReducer from '../features/rentals/rentalsSlice';
import supportReducer from '../features/support/supportSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    libraries: librariesReducer,
    books: booksReducer,
    rentals: rentalsReducer,
    support: supportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
