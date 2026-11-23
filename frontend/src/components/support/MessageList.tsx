import { useEffect, useRef } from 'react';
import type { Message } from '../../types';
import { NEAR_BOTTOM_PX, formatMessageTime } from '../../utils/support';

interface MessageListProps {
  messages: Message[];
  currentUserId: number | null;
  /** Сообщает родителю, внизу ли пользователь (для отметки «прочитано»). */
  onBottomChange?: (atBottom: boolean) => void;
  emptyText?: string;
}

/**
 * Лента сообщений чата.
 *
 * Свои сообщения — справа с подсветкой, чужие — слева. Текст выводится
 * обычным React-выводом (без HTML): разметка в сообщении не исполняется.
 * Автопрокрутка вниз выполняется только если пользователь и так внизу —
 * читающего старые сообщения нельзя сбрасывать в конец списка.
 */
const MessageList = ({
  messages,
  currentUserId,
  onBottomChange,
  emptyText = 'Сообщений пока нет',
}: MessageListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  /** Пользователь внизу списка (обновляется при скролле). */
  const atBottomRef = useRef(true);

  // Новые сообщения: прокручиваем вниз, только если были внизу.
  useEffect(() => {
    const element = listRef.current;
    if (element && atBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const element = listRef.current;
    if (!element) return;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distance <= NEAR_BOTTOM_PX;
    if (atBottom !== atBottomRef.current) {
      atBottomRef.current = atBottom;
      onBottomChange?.(atBottom);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <p className="message-list__empty">{emptyText}</p>
      </div>
    );
  }

  return (
    <div
      className="message-list"
      ref={listRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
    >
      {messages.map((message) => {
        const mine = message.author.id === currentUserId;
        return (
          <div
            key={message.id}
            className={`message-list__item${
              mine ? ' message-list__item--mine' : ''
            }`}
          >
            <div className="message-list__meta">
              <span className="message-list__author">
                {mine ? 'Вы' : message.author.name}
              </span>
              <time
                className="message-list__time"
                dateTime={message.createdAt}
              >
                {formatMessageTime(message.createdAt)}
              </time>
              {mine && (
                <span className="message-list__read">
                  {message.readAt !== null ? '✓✓' : '✓'}
                </span>
              )}
            </div>
            {/* Обычный текст: React экранирует символы, HTML не интерпретируется. */}
            <p className="message-list__text">{message.text}</p>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
