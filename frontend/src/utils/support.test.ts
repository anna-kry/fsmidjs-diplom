import { describe, expect, it } from 'vitest';
import {
  formatMessageTime,
  hasUnreadIncoming,
  mergeMessages,
} from './support';
import type { Message } from '../types';

/** Сообщение-заглушка для проверок слияния. */
function makeMessage(
  id: number,
  createdAt: string,
  overrides: Partial<Message> = {},
): Message {
  return {
    id,
    createdAt,
    text: `Сообщение ${id}`,
    readAt: '2026-11-03T10:00:00.000Z',
    author: { id: 1, name: 'Иван' },
    ...overrides,
  };
}

describe('mergeMessages: дедупликация и порядок', () => {
  it('одно и то же сообщение из REST и WS не дублируется', () => {
    const fromRest = [makeMessage(1, '2026-11-03T10:00:00.000Z')];
    const fromSocket = [makeMessage(1, '2026-11-03T10:00:00.000Z')];

    const merged = mergeMessages(fromRest, fromSocket);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(1);
  });

  it('новое сообщение добавляется к уже загруженной истории', () => {
    const history = [
      makeMessage(1, '2026-11-03T10:00:00.000Z'),
      makeMessage(2, '2026-11-03T10:01:00.000Z'),
    ];
    const incoming = [makeMessage(3, '2026-11-03T10:02:00.000Z')];

    const merged = mergeMessages(history, incoming);

    expect(merged.map((message) => message.id)).toEqual([1, 2, 3]);
  });

  it('порядок всегда хронологический, даже если события пришли не по порядку', () => {
    const late = [makeMessage(5, '2026-11-03T11:00:00.000Z')];
    const early = [
      makeMessage(4, '2026-11-03T09:00:00.000Z'),
      makeMessage(6, '2026-11-03T12:00:00.000Z'),
    ];

    const merged = mergeMessages(late, early);

    expect(merged.map((message) => message.id)).toEqual([4, 5, 6]);
  });

  it('уже известное сообщение не перезаписывается (readAt сохраняется)', () => {
    const read = makeMessage(1, '2026-11-03T10:00:00.000Z', {
      readAt: '2026-11-03T10:05:00.000Z',
    });
    const stale = makeMessage(1, '2026-11-03T10:00:00.000Z', { readAt: null });

    const merged = mergeMessages([read], [stale]);

    expect(merged[0].readAt).toBe('2026-11-03T10:05:00.000Z');
  });

  it('при одинаковой дате сортирует по id', () => {
    const sameTime = '2026-11-03T10:00:00.000Z';
    const merged = mergeMessages(
      [makeMessage(2, sameTime), makeMessage(1, sameTime)],
      [],
    );

    expect(merged.map((message) => message.id)).toEqual([1, 2]);
  });
});

describe('hasUnreadIncoming: непрочитанные входящие', () => {
  it('нет непрочитанных, если всё прочитано', () => {
    const messages = [
      makeMessage(1, '2026-11-03T10:00:00.000Z'),
      makeMessage(2, '2026-11-03T10:01:00.000Z', { readAt: null }),
    ];

    expect(hasUnreadIncoming(messages, 1)).toBe(false);
  });

  it('находит входящее непрочитанное сообщение', () => {
    const messages = [
      makeMessage(1, '2026-11-03T10:00:00.000Z', {
        readAt: null,
        author: { id: 2, name: 'Менеджер' },
      }),
    ];

    expect(hasUnreadIncoming(messages, 1)).toBe(true);
  });

  it('свои непрочитанные сообщения не считаются входящими', () => {
    const messages = [
      makeMessage(1, '2026-11-03T10:00:00.000Z', { readAt: null }),
    ];

    expect(hasUnreadIncoming(messages, 1)).toBe(false);
  });
});

describe('formatMessageTime: время сообщения', () => {
  it('для сегодняшнего сообщения возвращает только время', () => {
    const now = new Date();
    const iso = now.toISOString();

    expect(formatMessageTime(iso)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('для старого сообщения добавляет дату', () => {
    expect(formatMessageTime('2020-01-01T10:30:00.000Z')).toMatch(
      /\d{2}\.\d{2} \d{2}:\d{2}/,
    );
  });
});
