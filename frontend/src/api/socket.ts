import { io, Socket } from 'socket.io-client';

/** Состояние соединения чата — показывается в интерфейсе при проблемах. */
export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

/** Онлайн-статус пользователя. */
export type UserPresence = { userId: number; online: boolean };

/**
 * Одно соединение Socket.IO на всё приложение.
 *
 * Адрес — текущий origin (путь `/socket.io`): в разработке его проксирует
 * Vite, в проде фронт и API раздаёт один сервер. Cookie сессии уходит
 * автоматически (`withCredentials: true`), session ID вручную не передаём.
 */
let socket: Socket | null = null;
/** Сколько интерфейсов чата сейчас держат соединение. */
let activeConsumers = 0;
let status: SocketStatus = 'idle';
const statusListeners = new Set<(status: SocketStatus) => void>();
/** Пользователи, которые сейчас онлайн (по данным сервера). */
const onlineUsers = new Set<number>();
const presenceListeners = new Set<(presence: UserPresence) => void>();

function setStatus(next: SocketStatus): void {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener(next));
}

function setOnline(userId: number, online: boolean): void {
  if (online) {
    onlineUsers.add(userId);
  } else {
    onlineUsers.delete(userId);
  }
  presenceListeners.forEach((listener) => listener({ userId, online }));
}

function createSocket(): Socket {
  setStatus('connecting');
  const instance = io({ withCredentials: true });

  instance.on('connect', () => setStatus('connected'));
  instance.on('disconnect', () => setStatus('disconnected'));
  // Ошибка handshake (например, неаутентифицированный пользователь).
  // Сокет сам пытается переподключиться дальше.
  instance.on('connect_error', () => setStatus('disconnected'));
  // Событие присутствия от сервера: пользователь стал онлайн/оффлайн.
  instance.on('presenceChanged', (payload: UserPresence) => {
    setOnline(payload.userId, Boolean(payload.online));
  });

  return instance;
}

/**
 * Берёт общее соединение для интерфейса чата.
 * Каждому открытому чату нужен парный вызов `releaseSocket()` при уходе.
 */
export function acquireSocket(): Socket {
  activeConsumers += 1;

  if (!socket) {
    socket = createSocket();
    return socket;
  }
  // Соединение уже было закрыто (например, после выхода из чата) — открываем снова.
  if (socket.disconnected) {
    setStatus('connecting');
    socket.connect();
  }
  return socket;
}

/** Отпускает соединение: когда интерфейсов чата не осталось — отключаем сокет. */
export function releaseSocket(): void {
  activeConsumers = Math.max(0, activeConsumers - 1);
  if (activeConsumers === 0 && socket) {
    socket.disconnect();
    setStatus('disconnected');
  }
}

/** Текущее состояние соединения (для первого рендера). */
export function getSocketStatus(): SocketStatus {
  return status;
}

/** Подписка на изменения состояния соединения. Возвращает функцию отписки. */
export function subscribeSocketStatus(
  listener: (status: SocketStatus) => void,
): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

/** Онлайн-ли пользователь в данный момент (по последнему событию присутствия). */
export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

/** Подписка на изменения онлайн-статуса пользователей. Возвращает функцию отписки. */
export function subscribePresence(
  listener: (presence: UserPresence) => void,
): () => void {
  presenceListeners.add(listener);
  return () => {
    presenceListeners.delete(listener);
  };
}

/**
 * Подписаться на изменения присутствия конкретного пользователя.
 * Сервер отдаёт события только для пользователей, к которым есть доступ.
 */
export function subscribePresenceUser(userId: number): void {
  const s = acquireSocket();
  void s.emit('presence:subscribe', { userId });
}

/** Отписаться от изменений присутствия пользователя. */
export function unsubscribePresenceUser(userId: number): void {
  const s = getSocket();
  if (s) {
    void s.emit('presence:unsubscribe', { userId });
  }
}

function getSocket(): Socket | null {
  return socket;
}
