import { PresenceService } from './services/presence.service';

describe('PresenceService', () => {
  it('пользователь становится онлайн после первого соединения', () => {
    const service = new PresenceService();
    const r1 = service.addConnection(1, 'socket-a');
    expect(r1.online).toBe(true);
    expect(r1.count).toBe(1);
    expect(service.isOnline(1)).toBe(true);
  });

  it('второе соединение того же пользователя не меняет онлайн-статус', () => {
    const service = new PresenceService();
    service.addConnection(1, 'socket-a');
    const r2 = service.addConnection(1, 'socket-b');
    expect(r2.online).toBe(false);
    expect(r2.count).toBe(2);
    expect(service.isOnline(1)).toBe(true);
  });

  it('закрытие одного из двух соединений не переводит в оффлайн', () => {
    const service = new PresenceService();
    service.addConnection(1, 'socket-a');
    service.addConnection(1, 'socket-b');
    const r = service.removeConnection('socket-a');
    expect(r.online).toBe(true);
    expect(r.count).toBe(1);
    expect(service.isOnline(1)).toBe(true);
  });

  it('закрытие последнего соединения переводит в оффлайн', () => {
    const service = new PresenceService();
    service.addConnection(1, 'socket-a');
    const r = service.removeConnection('socket-a');
    expect(r.online).toBe(false);
    expect(r.count).toBe(0);
    expect(service.isOnline(1)).toBe(false);
  });

  it('удаление неизвестного сокета возвращает null', () => {
    const service = new PresenceService();
    expect(service.removeConnection('unknown')).toBeNull();
  });

  it('пользователи независимы', () => {
    const service = new PresenceService();
    service.addConnection(1, 'socket-a');
    expect(service.isOnline(1)).toBe(true);
    expect(service.isOnline(2)).toBe(false);
    service.removeConnection('socket-a');
    expect(service.isOnline(1)).toBe(false);
  });
});
