import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { getApiErrorMessage } from '../../api/error';
import { supportApi } from '../../api/support.api';
import { sessionExpired } from '../auth/authSlice';
import { mergeMessages } from '../../utils/support';
import type { Message, NewMessage, SupportRequest } from '../../types';

/** Роль, которая читает список обращений (у каждой роли свой эндпоинт). */
export type SupportRole = 'client' | 'manager';

export interface SupportState {
  /** Список обращений: свои у клиента, все у менеджера. */
  requests: SupportRequest[];
  requestsLoading: boolean;
  requestsError: string | null;
  /** Создание обращения (клиент). */
  createLoading: boolean;
  createError: string | null;
  /** Открытый чат. */
  selectedId: number | null;
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  /** Отправка сообщения. */
  sending: boolean;
  sendError: string | null;
  /** Онлайн-статус пользователей: userId → online. */
  presence: Record<number, boolean>;
  /** Закрытие обращения менеджером. */
  closing: boolean;
  closeError: string | null;
}

const initialState: SupportState = {
  requests: [],
  requestsLoading: false,
  requestsError: null,
  createLoading: false,
  createError: null,
  selectedId: null,
  messages: [],
  messagesLoading: false,
  messagesError: null,
  sending: false,
  sendError: null,
  presence: {},
  closing: false,
  closeError: null,
};

/** Сообщение сервера о закрытом обращении (backend: «Обращение закрыто»). */
function isClosedRequestError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 400;
}

/** Список обращений: клиент и менеджер читают разные эндпоинты. */
export const fetchSupportRequests = createAsyncThunk<
  SupportRequest[],
  { role: SupportRole; isActive: boolean },
  { rejectValue: string }
>(
  'support/fetchSupportRequests',
  async ({ role, isActive }, { dispatch, rejectWithValue }) => {
    try {
      return role === 'manager'
        ? await supportApi.fetchManagerRequests(isActive)
        : await supportApi.fetchClientRequests(isActive);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        dispatch(sessionExpired());
        return rejectWithValue('Сессия истекла, войдите заново');
      }
      return rejectWithValue(
        getApiErrorMessage(error, 'Не удалось загрузить обращения'),
      );
    }
  },
);

/** Создание обращения: текст становится первым сообщением чата. */
export const createSupportRequest = createAsyncThunk<
  SupportRequest,
  string,
  { rejectValue: string }
>('support/createSupportRequest', async (text, { dispatch, rejectWithValue }) => {
  try {
    return await supportApi.createSupportRequest(text);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось создать обращение'),
    );
  }
});

/** Загрузка истории сообщений открытого обращения. */
export const openSupportRequest = createAsyncThunk<
  Message[],
  number,
  { rejectValue: string }
>('support/openSupportRequest', async (id, { dispatch, rejectWithValue }) => {
  try {
    return await supportApi.fetchMessages(id);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось загрузить сообщения'),
    );
  }
});

/** Отправка сообщения. Возвращает id чата, чтобы не подменить чужой открытый. */
export const sendMessage = createAsyncThunk<
  { chatId: number; message: Message },
  { id: number; text: string },
  { rejectValue: string }
>('support/sendMessage', async ({ id, text }, { dispatch, rejectWithValue }) => {
  try {
    const message = await supportApi.sendMessage(id, text);
    return { chatId: id, message };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    const message = getApiErrorMessage(error, 'Не удалось отправить сообщение');
    // Backend — источник истины: если сервер ответил, что обращение закрыто,
    // помечаем его закрытым и блокируем ввод у клиента.
    if (isClosedRequestError(error) && message.includes('закрыто')) {
      dispatch(markRequestClosed(id));
    }
    return rejectWithValue(message);
  }
});

/** Отметка входящих сообщений прочитанными (`createdBefore` — метка времени). */
export const markMessagesRead = createAsyncThunk<
  { chatId: number; createdBefore: string; userId: number | null },
  { id: number; createdBefore: string },
  { state: { auth: { user: { id: number } | null } }; rejectValue: string }
>(
  'support/markMessagesRead',
  async ({ id, createdBefore }, { getState, dispatch, rejectWithValue }) => {
    try {
      await supportApi.markMessagesRead(id, createdBefore);
      return {
        chatId: id,
        createdBefore,
        userId: getState().auth.user?.id ?? null,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        dispatch(sessionExpired());
        return rejectWithValue('Сессия истекла, войдите заново');
      }
      return rejectWithValue(getApiErrorMessage(error, 'Не удалось отметить сообщения'));
    }
  },
);

/** Закрытие обращения менеджером. */
export const closeSupportRequest = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('support/closeSupportRequest', async (id, { dispatch, rejectWithValue }) => {
  try {
    await supportApi.closeRequest(id);
    return id;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(sessionExpired());
      return rejectWithValue('Сессия истекла, войдите заново');
    }
    return rejectWithValue(
      getApiErrorMessage(error, 'Не удалось закрыть обращение'),
    );
  }
});

const supportSlice = createSlice({
  name: 'support',
  initialState,
  reducers: {
    /** Выбор обращения в списке: готовим пустой чат под новую историю. */
    selectRequest(state, action: PayloadAction<number>) {
      state.selectedId = action.payload;
      state.messages = [];
      state.messagesLoading = true;
      state.messagesError = null;
      state.sendError = null;
      state.closeError = null;
    },
    /** Снять выделение (например, при смене фильтра списка). */
    clearSelection(state) {
      state.selectedId = null;
      state.messages = [];
      state.messagesLoading = false;
      state.messagesError = null;
      state.sendError = null;
    },
    /**
     * Новое сообщение из WebSocket. В Redux попадает всегда: индикатор
     * непрочитанных обновится даже для чата, открытого раньше. Сообщение
     * попадает в ленту только открытого чата; дубликаты отсекает mergeMessages.
     */
    receiveMessage(
      state,
      action: PayloadAction<{ message: NewMessage; unread: boolean }>,
    ) {
      const { message, unread } = action.payload;
      if (state.selectedId === message.supportRequestId) {
        state.messages = mergeMessages(state.messages, [message]);
      }
      const request = state.requests.find(
        (item) => item.id === message.supportRequestId,
      );
      if (request && unread) {
        request.hasNewMessages = true;
      }
    },
    /** Отправленное нами сообщение (ответ REST; WS-дубль отфильтрует merge). */
    messageSent(
      state,
      action: PayloadAction<{ chatId: number; message: Message }>,
    ) {
      const { chatId, message } = action.payload;
      if (state.selectedId === chatId) {
        state.messages = mergeMessages(state.messages, [message]);
      }
    },
    /** Сервер подтвердил закрытие обращения (ответом или ошибкой отправки). */
    markRequestClosed(state, action: PayloadAction<number>) {
      const request = state.requests.find((item) => item.id === action.payload);
      if (request) {
        request.isActive = false;
      }
    },
    /**
     * Событие WebSocket messagesRead: собеседник отметил сообщения прочитанными.
     * Обновляем readAt у наших сообщений — появляются две галочки.
     */
    messagesRead(
      state,
      action: PayloadAction<{
        chatId: number;
        readerId: number;
        createdBefore: string;
        currentUserId: number | null;
      }>,
    ) {
      const { chatId, readerId, createdBefore, currentUserId } = action.payload;
      // Свой статус не обновляем: галочки показываются только у собственных сообщений
      // и означают, что собеседник их прочитал.
      if (readerId === currentUserId || currentUserId === null) return;
      if (state.selectedId === chatId) {
        for (const message of state.messages) {
          if (
            message.author.id === currentUserId &&
            message.readAt === null &&
            message.createdAt <= createdBefore
          ) {
            message.readAt = createdBefore;
          }
        }
      }
    },
    /** Онлайн-статус пользователя из события присутствия. */
    presenceChanged(state, action: PayloadAction<{ userId: number; online: boolean }>) {
      const { userId, online } = action.payload;
      state.presence[userId] = online;
    },
    /** Полный сброс при уходе со страницы поддержки. */
    resetSupport() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- Список обращений ----
      .addCase(fetchSupportRequests.pending, (state) => {
        state.requestsLoading = true;
        state.requestsError = null;
      })
      .addCase(fetchSupportRequests.fulfilled, (state, action) => {
        state.requestsLoading = false;
        state.requests = action.payload;
      })
      .addCase(fetchSupportRequests.rejected, (state, action) => {
        state.requestsLoading = false;
        state.requestsError =
          action.payload ?? 'Не удалось загрузить обращения';
      })
      // ---- Создание обращения ----
      .addCase(createSupportRequest.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createSupportRequest.fulfilled, (state) => {
        state.createLoading = false;
      })
      .addCase(createSupportRequest.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload ?? 'Не удалось создать обращение';
      })
      // ---- История сообщений ----
      .addCase(openSupportRequest.pending, (state, action) => {
        state.selectedId = action.meta.arg;
        state.messages = [];
        state.messagesLoading = true;
        state.messagesError = null;
        state.sendError = null;
      })
      .addCase(openSupportRequest.fulfilled, (state, action) => {
        // Пользователь успел переключиться или уйти — историю не подменяем.
        if (state.selectedId !== action.meta.arg) return;
        state.messages = mergeMessages([], action.payload);
        state.messagesLoading = false;
      })
      .addCase(openSupportRequest.rejected, (state, action) => {
        if (state.selectedId !== action.meta.arg) return;
        state.messagesLoading = false;
        state.messagesError =
          action.payload ?? 'Не удалось загрузить сообщения';
      })
      // ---- Отправка сообщения ----
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.sendError = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        supportSlice.caseReducers.messageSent(state, action);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.sendError = action.payload ?? 'Не удалось отправить сообщение';
      })
      // ---- Отметка прочитанными ----
      .addCase(markMessagesRead.fulfilled, (state, action) => {
        const { chatId, createdBefore, userId } = action.payload;
        if (state.selectedId === chatId) {
          for (const message of state.messages) {
            if (
              message.readAt === null &&
              message.author.id !== userId &&
              message.createdAt <= createdBefore
            ) {
              message.readAt = createdBefore;
            }
          }
        }
        const request = state.requests.find((item) => item.id === chatId);
        if (request) {
          request.hasNewMessages = false;
        }
      })
      // ---- Закрытие обращения ----
      .addCase(closeSupportRequest.pending, (state) => {
        state.closing = true;
        state.closeError = null;
      })
      .addCase(closeSupportRequest.fulfilled, (state, action) => {
        state.closing = false;
        supportSlice.caseReducers.markRequestClosed(state, action);
      })
      .addCase(closeSupportRequest.rejected, (state, action) => {
        state.closing = false;
        state.closeError = action.payload ?? 'Не удалось закрыть обращение';
      });
  },
});

export const {
  selectRequest,
  clearSelection,
  receiveMessage,
  messageSent,
  markRequestClosed,
  messagesRead,
  presenceChanged,
  resetSupport,
} = supportSlice.actions;
export default supportSlice.reducer;
