import http from './http';
import type { Message, SupportRequest } from '../types';

/**
 * REST API поддержки (раздел 6.6): только существующие эндпоинты backend.
 * Отправка сообщений — только через REST, WebSocket рассылает их участникам.
 */
export const supportApi = {
  /** Свои обращения клиента. `isActive` — фильтр списка (default: активные). */
  async fetchClientRequests(isActive: boolean): Promise<SupportRequest[]> {
    const response = await http.get<SupportRequest[]>(
      '/client/support-requests',
      { params: { isActive } },
    );
    return response.data;
  },

  /** Создать обращение: текст первого сообщения (1..2000). */
  async createSupportRequest(text: string): Promise<SupportRequest> {
    const response = await http.post<SupportRequest>(
      '/client/support-requests',
      { text },
    );
    return response.data;
  },

  /** Все обращения менеджера, `isActive` — фильтр (default: активные). */
  async fetchManagerRequests(isActive: boolean): Promise<SupportRequest[]> {
    const response = await http.get<SupportRequest[]>(
      '/manager/support-requests',
      { params: { isActive } },
    );
    return response.data;
  },

  /** История сообщений обращения (доступ проверяет backend). */
  async fetchMessages(requestId: number): Promise<Message[]> {
    const response = await http.get<Message[]>(
      `/common/support-requests/${requestId}/messages`,
    );
    return response.data;
  },

  /** Отправить сообщение в обращение (закрытое обращение отклоняется). */
  async sendMessage(requestId: number, text: string): Promise<Message> {
    const response = await http.post<Message>(
      `/common/support-requests/${requestId}/messages`,
      { text },
    );
    return response.data;
  },

  /** Отметить входящие сообщения до `createdBefore` прочитанными. */
  async markMessagesRead(
    requestId: number,
    createdBefore: string,
  ): Promise<void> {
    await http.post(`/common/support-requests/${requestId}/messages/read`, {
      createdBefore,
    });
  },

  /** Закрыть обращение (только менеджер) → { success: true }. */
  async closeRequest(requestId: number): Promise<void> {
    await http.post(`/manager/support-requests/${requestId}/close`);
  },
};
