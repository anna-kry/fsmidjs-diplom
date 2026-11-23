import { describe, expect, it } from 'vitest';
import supportReducer, {
  messagesRead,
  presenceChanged,
} from './supportSlice';
import type { SupportState } from './supportSlice';

const initialState: SupportState = {
  requests: [],
  requestsLoading: false,
  requestsError: null,
  createLoading: false,
  createError: null,
  selectedId: 1,
  messages: [
    { id: 1, createdAt: '2026-01-01T10:00:00Z', text: 'a', readAt: null, author: { id: 1, name: 'Я' } },
    { id: 2, createdAt: '2026-01-01T10:01:00Z', text: 'b', readAt: null, author: { id: 2, name: 'Собеседник' } },
    { id: 3, createdAt: '2026-01-01T10:02:00Z', text: 'c', readAt: null, author: { id: 1, name: 'Я' } },
  ],
  messagesLoading: false,
  messagesError: null,
  sending: false,
  sendError: null,
  presence: {},
  closing: false,
  closeError: null,
};

describe('supportSlice messagesRead', () => {
  it('ставит readAt у своих сообщений до createdBefore, не трогая чужие', () => {
    const state = supportReducer(
      initialState,
      messagesRead({
        chatId: 1,
        readerId: 2,
        createdBefore: '2026-01-01T10:01:30Z',
        currentUserId: 1,
      }),
    );
    expect(state.messages[0].readAt).toBe('2026-01-01T10:01:30Z');
    expect(state.messages[1].readAt).toBeNull();
    expect(state.messages[2].readAt).toBeNull();
  });

  it('не обновляет собственные сообщения, если читающий — сам пользователь', () => {
    const state = supportReducer(
      initialState,
      messagesRead({
        chatId: 1,
        readerId: 1,
        createdBefore: '2026-01-01T10:01:30Z',
        currentUserId: 1,
      }),
    );
    expect(state.messages[0].readAt).toBeNull();
    expect(state.messages[2].readAt).toBeNull();
  });

  it('повторное событие не ломает уже установленный readAt', () => {
    const first = supportReducer(
      initialState,
      messagesRead({
        chatId: 1,
        readerId: 2,
        createdBefore: '2026-01-01T10:01:30Z',
        currentUserId: 1,
      }),
    );
    const second = supportReducer(
      first,
      messagesRead({
        chatId: 1,
        readerId: 2,
        createdBefore: '2026-01-01T10:03:00Z',
        currentUserId: 1,
      }),
    );
    expect(second.messages[0].readAt).toBe('2026-01-01T10:01:30Z');
    expect(second.messages[2].readAt).toBe('2026-01-01T10:03:00Z');
  });
});

describe('supportSlice presenceChanged', () => {
  it('сохраняет онлайн-статус пользователя', () => {
    const state = supportReducer(
      initialState,
      presenceChanged({ userId: 5, online: true }),
    );
    expect(state.presence[5]).toBe(true);
  });

  it('обновляет статус на оффлайн', () => {
    let state = supportReducer(
      initialState,
      presenceChanged({ userId: 5, online: true }),
    );
    state = supportReducer(state, presenceChanged({ userId: 5, online: false }));
    expect(state.presence[5]).toBe(false);
  });
});
