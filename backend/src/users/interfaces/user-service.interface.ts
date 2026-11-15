import { ID } from '../../common/types/id.type';
import { User } from '../entities/user.entity';

export interface SearchUserParams {
  limit: number;
  offset: number;
  email: string;
  name: string;
  contactPhone: string;
}

export interface IUserService {
  // Принимает уже готовый passwordHash: хеширование делает вызывающий через PasswordService
  create(data: Partial<User>): Promise<User>;
  findById(id: ID): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(params: SearchUserParams): Promise<User[]>;
}
