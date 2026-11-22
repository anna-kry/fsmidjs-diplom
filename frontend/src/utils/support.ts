import type { Message } from '../types';

/** Порог «пользователь внизу списка» в пикселях. */
const NEAR_BOTTOM_PX = 40;

/** Сравнение сообщений: по дате, при равенстве — по id. */
function compareMessages(a: Message, b: Message): number {
  const byDate = a.createdAt.localeCompare(b.createdAt);
  return byDate !== 0 ? byDate : a.id - b.id;
}

/**
 * Слияние сообщений без дубликатов (по `id`) в хронологическом порядке.
 *
 * Нужно, чтобы гонка «история из REST ↔ события WebSocket» не приводила
 * к двум копиям одного сообщения. Уже известное сообщение не перезаписывается —
 * так сохраняется локально обновлённый `readAt`.
 */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map<number, Message>();
  for (const message of current) {
    byId.set(message.id, message);
  }
  for (const message of incoming) {
    if (!byId.has(message.id)) {
      byId.set(message.id, message);
    }
  }
  return Array.from(byId.values()).sort(compareMessages);
}

/** Локальная дата и время сообщения: «14:05» сегодня, иначе «03.11 14:05». */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (sameDay) return time;

  const day = date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day} ${time}`;
}

/** Дата обращения в списках: «03.11.2026, 14:05». */
export function formatSupportDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Есть ли в истории входящие непрочитанные сообщения. */
export function hasUnreadIncoming(
  messages: Message[],
  currentUserId: number | null,
): boolean {
  if (currentUserId === null) return false;
  return messages.some(
    (message) => message.readAt === null && message.author.id !== currentUserId,
  );
}

export { NEAR_BOTTOM_PX };
