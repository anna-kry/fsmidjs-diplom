import http from './http';
import type { CreateUserInput, User, UserListItem } from '../types';

/** Query-параметры списков пользователей (раздел 6.2 спецификации). */
export interface UserListParams {
  limit: number;
  offset: number;
  email?: string;
  name?: string;
  contactPhone?: string;
}

export const usersApi = {
  async fetchAdminUsers(params: UserListParams): Promise<UserListItem[]> {
    const response = await http.get<UserListItem[]>('/admin/users', { params });
    return response.data;
  },

  async fetchManagerUsers(params: UserListParams): Promise<UserListItem[]> {
    const response = await http.get<UserListItem[]>('/manager/users', { params });
    return response.data;
  },

  async createAdminUser(data: CreateUserInput): Promise<User> {
    const response = await http.post<User>('/admin/users', data);
    return response.data;
  },
};
