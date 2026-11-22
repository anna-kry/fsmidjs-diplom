import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ErrorAlert from '../common/ErrorAlert';
import Loader from '../common/Loader';
import MessageList from './MessageList';
import MessageForm from './MessageForm';
import {
  acquireSocket,
  getSocketStatus,
  releaseSocket,
  subscribeSocketStatus,
  type SocketStatus,
} from '../../api/socket';
import {
  markMessagesRead,
  openSupportRequest,
  receiveMessage,
  sendMessage,
} from '../../features/support/supportSlice';
import { hasUnreadIncoming } from '../../utils/support';
import type { NewMessage } from '../../types';

interface ChatWindowProps {
  /** Открытый чат: загружает историю, подписывается на WebSocket. */
  requestId: number;
  /** Обращение активно — отправка включена; false блокирует форму. */
  isActive: boolean;
  /** Заголовок чата (имя клиента — на странице менеджера). */
  title?: string;
}

/**
 * Окно чата поддержки (спецификация, раздел 7):
 * 1) история загружается по REST;
 * 2) после загрузки сокет подписывается на `subscribeToChat`;
 * 3) новые сообщения приходят по `newMessage` и попадают в Redux;
 * 4) входящие отмечаются прочитанными, когда пользователь их видит.
 *
 * Сокет один на приложение; при уходе из чата слушатели снимаются,
 * а соединение закрывается, когда открытых чатов больше нет.
 */
const ChatWindow = ({ requestId, isActive, title }: ChatWindowProps) => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(
    (state) => state.auth.user?.id ?? null,
  );
  const { messages, messagesLoading, messagesError, sending, sendError } =
    useAppSelector((state) => state.support);

  const [socketStatus, setSocketStatus] =
    useState<SocketStatus>(getSocketStatus);
  /** Ошибка подписки на комнату чата (событие `exception`). */
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  /** Пользователь внизу ленты — новые сообщения можно показывать скроллом. */
  const atBottomRef = useRef(true);
  /** Входящие, просмотр которых отложен (пользователь читал старые). */
  const pendingReadRef = useRef<string | null>(null);
  /** История загружена — подписываемся только после неё (раздел 7). */
  const historyReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    historyReadyRef.current = false;
    pendingReadRef.current = null;
    atBottomRef.current = true;

    const socket = acquireSocket();

    /** Подписка на обращение: после истории и повторно при реконнекте. */
    const subscribe = () => {
      if (cancelled || !historyReadyRef.current) return;
      socket.emit(
        'subscribeToChat',
        requestId,
        (ack?: { chatId?: number }) => {
          if (!cancelled && ack?.chatId === requestId) {
            setSubscribeError(null);
          }
        },
      );
    };

    const handleNewMessage = (message: NewMessage) => {
      const unread = message.author.id !== currentUserId;
      // В Redux сообщение попадает всегда: индикатор непрочитанных в списке
      // обновится и для чатов, открытых раньше (дедупликация — в редьюсере).
      void dispatch(receiveMessage({ message, unread }));

      if (cancelled || message.supportRequestId !== requestId || !unread) {
        return;
      }
      if (atBottomRef.current) {
        // Сообщение видно — сразу отмечаем прочитанным.
        pendingReadRef.current = null;
        void dispatch(
          markMessagesRead({
            id: requestId,
            createdBefore: new Date().toISOString(),
          }),
        );
      } else {
        // Пользователь читает старые сообщения: отметим, когда вернётся вниз.
        if (
          !pendingReadRef.current ||
          message.createdAt > pendingReadRef.current
        ) {
          pendingReadRef.current = message.createdAt;
        }
      }
    };

    // Отказ сервера на подписку (WsException → событие `exception`).
    const handleException = (error?: { code?: number; message?: string }) => {
      if (cancelled) return;
      setSubscribeError(
        error?.message ?? 'Не удалось подписаться на обновления чата',
      );
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('exception', handleException);
    const unsubscribeStatus = subscribeSocketStatus((next) => {
      if (cancelled) return;
      setSocketStatus(next);
      // После переподключения комната на сервере потеряна — подписываемся снова.
      if (next === 'connected') subscribe();
    });

    // Шаг 1 — история по REST, шаг 2 — подписка (спецификация, раздел 7).
    void dispatch(openSupportRequest(requestId)).then((result) => {
      if (cancelled || !openSupportRequest.fulfilled.match(result)) return;
      historyReadyRef.current = true;
      // Открытый чат: показанные входящие считаются просмотренными.
      if (hasUnreadIncoming(result.payload, currentUserId)) {
        void dispatch(
          markMessagesRead({
            id: requestId,
            createdBefore: new Date().toISOString(),
          }),
        );
      }
      subscribe();
    });

    return () => {
      cancelled = true;
      socket.off('newMessage', handleNewMessage);
      socket.off('exception', handleException);
      unsubscribeStatus();
      releaseSocket();
    };
  }, [requestId, dispatch, currentUserId]);

  /** Пользователь вернулся вниз — читаем отложенные входящие. */
  const handleBottomChange = useCallback(
    (atBottom: boolean) => {
      atBottomRef.current = atBottom;
      if (atBottom && pendingReadRef.current) {
        const createdBefore = pendingReadRef.current;
        pendingReadRef.current = null;
        void dispatch(markMessagesRead({ id: requestId, createdBefore }));
      }
    },
    [dispatch, requestId],
  );

  /** true — сообщение отправлено, форма может очистить поле ввода. */
  const handleSend = useCallback(
    async (text: string) => {
      const result = await dispatch(sendMessage({ id: requestId, text }));
      return sendMessage.fulfilled.match(result);
    },
    [dispatch, requestId],
  );

  return (
    <section className="chat-window">
      <header className="chat-window__header">
        <h2 className="chat-window__title">{title ?? `Обращение № ${requestId}`}</h2>
        <span
          className={`chat-window__status ${
            isActive
              ? 'chat-window__status--active'
              : 'chat-window__status--closed'
          }`}
        >
          {isActive ? 'Активное' : 'Закрытое'}
        </span>
        {socketStatus !== 'connected' && (
          <span className="chat-window__offline">
            Нет соединения с сервером — сообщения могут приходить с задержкой
          </span>
        )}
      </header>

      <div className="chat-window__notices">
        {messagesError && <ErrorAlert message={messagesError} />}
        {subscribeError && <ErrorAlert message={subscribeError} />}
        {sendError && <ErrorAlert message={sendError} />}
      </div>

      <div className="chat-window__body">
        {messagesLoading ? (
          <Loader text="Загрузка сообщений…" />
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            onBottomChange={handleBottomChange}
          />
        )}
      </div>

      {!isActive && (
        <p className="chat-window__closed-note">
          Обращение закрыто. Отправка сообщений недоступна.
        </p>
      )}

      <MessageForm
        disabled={!isActive}
        sending={sending}
        onSend={handleSend}
      />
    </section>
  );
};

export default ChatWindow;
