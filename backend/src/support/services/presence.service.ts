import { Injectable, Logger } from '@nestjs/common';
import { ID } from '../../common/types/id.type';

/**
 * Серверный реестр активных Socket.IO-соединений пользователей.
 *
 * Хранит в памяти количество одновременных соединений на пользователя:
 * Map<userId, Set<socketId>>. Пользователь считается онлайн, пока у него
 * есть хотя бы одно активное соединение (любая вкладка/устройство).
 *
 * Реестр живёт в памяти одного экземпляра backend. При нескольких репликах
 * backend статус будет точным только внутри одной реплики; это ограничение
 * описано в отчёте к задаче.
 */
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  /** userId → множество идентификаторов активных сокетов этого пользователя. */
  private readonly connections = new Map<ID, Set<string>>();

  /**
   * Регистрирует новое соединение пользователя.
   * Возвращает { online, count }, где online — стал ли пользователь онлайн
   * (перешёл из состояния «нет соединений» в «есть соединение»).
   */
  addConnection(userId: ID, socketId: string): { online: boolean; count: number } {
    let sockets = this.connections.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.connections.set(userId, sockets);
    }
    sockets.add(socketId);
    const count = sockets.size;
    const online = count === 1;
    if (online) {
      this.logger.log(`Пользователь ${userId} стал онлайн (соединений: ${count})`);
    }
    return { online, count };
  }

  /**
   * Удаляет соединение по идентификатору сокета.
   * Возвращает { userId, online, count } или null, если сокета не было.
   * online — остался ли пользователь онлайн после удаления.
   */
  removeConnection(socketId: string): { userId: ID; online: boolean; count: number } | null {
    for (const [userId, sockets] of this.connections.entries()) {
      if (sockets.delete(socketId)) {
        const count = sockets.size;
        const online = count > 0;
        if (count === 0) {
          this.connections.delete(userId);
          this.logger.log(`Пользователь ${userId} стал оффлайн`);
        }
        return { userId, online, count };
      }
    }
    return null;
  }

  /** Онлайн-ли пользователь в данный момент. */
  isOnline(userId: ID): boolean {
    const sockets = this.connections.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  /** Количество активных соединений пользователя. */
  connectionCount(userId: ID): number {
    return this.connections.get(userId)?.size ?? 0;
  }
}
