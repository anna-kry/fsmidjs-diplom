import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { escapeLike } from '../common/utils/escape-like';
import { User } from './entities/user.entity';
import { IUserService, SearchUserParams } from './interfaces/user-service.interface';

@Injectable()
export class UsersService implements IUserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create({
      ...data,
      email: data.email ? data.email.toLowerCase() : data.email,
    });
    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email: email.toLowerCase() });
  }

  async findAll(params: SearchUserParams): Promise<User[]> {
    const query = this.usersRepository.createQueryBuilder('user');

    if (params.email) {
      query.andWhere('user.email ILIKE :email', {
        email: `%${escapeLike(params.email)}%`,
      });
    }
    if (params.name) {
      query.andWhere('user.name ILIKE :name', {
        name: `%${escapeLike(params.name)}%`,
      });
    }
    if (params.contactPhone) {
      query.andWhere('user.contactPhone ILIKE :contactPhone', {
        contactPhone: `%${escapeLike(params.contactPhone)}%`,
      });
    }

    query.orderBy('user.id', 'ASC');
    query.skip(params.offset);
    query.take(params.limit);

    return query.getMany();
  }
}
