import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  /** Открыто ли модальное окно входа. */
  isLoginModalOpen: boolean;
  /** Открыто ли модальное окно регистрации. */
  isRegisterModalOpen: boolean;
  /** Показывать сообщение об успешной регистрации в модалке входа. */
  showRegisteredMessage: boolean;
}

const initialState: UiState = {
  isLoginModalOpen: false,
  isRegisterModalOpen: false,
  showRegisteredMessage: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openLoginModal(state, action: PayloadAction<boolean | undefined>) {
      state.isLoginModalOpen = true;
      state.isRegisterModalOpen = false;
      state.showRegisteredMessage = action.payload ?? false;
    },
    closeLoginModal(state) {
      state.isLoginModalOpen = false;
      state.showRegisteredMessage = false;
    },
    openRegisterModal(state) {
      state.isRegisterModalOpen = true;
      state.isLoginModalOpen = false;
      state.showRegisteredMessage = false;
    },
    closeRegisterModal(state) {
      state.isRegisterModalOpen = false;
    },
    closeAllModals(state) {
      state.isLoginModalOpen = false;
      state.isRegisterModalOpen = false;
      state.showRegisteredMessage = false;
    },
  },
});

export const {
  openLoginModal,
  closeLoginModal,
  openRegisterModal,
  closeRegisterModal,
  closeAllModals,
} = uiSlice.actions;

export default uiSlice.reducer;