import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

/**
 * Хранит в сессии только id пользователя;
 * при каждом запросе пользователь загружается из БД.
 */
@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: User, done: (err?: unknown, id?: number) => void): void {
    done(null, user.id);
  }

  async deserializeUser(
    payload: number,
    done: (err?: unknown, user?: User | null) => void,
  ): Promise<void> {
    try {
      const user = await this.usersService.findById(payload);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }
}
