import http from './http';
import type { User } from '../types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  contactPhone?: string;
}

/** Ответ POST /api/client/register. */
export interface RegisterResult {
  id: number;
  email: string;
  name: string;
}

/**
 * Вызовы аутентификации. Сессия живёт в cookie,
 * поэтому пароль и cookie в Redux не сохраняются.
 */
export const authApi = {
  async login(data: LoginInput): Promise<User> {
    const response = await http.post<User>('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterInput): Promise<RegisterResult> {
    const response = await http.post<RegisterResult>('/client/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout');
  },

  async me(): Promise<User> {
    const response = await http.get<User>('/auth/me');
    return response.data;
  },
};
