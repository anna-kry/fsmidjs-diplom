import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../users/entities/user.entity';
import { PasswordService } from '../users/password.service';
import { UsersService } from '../users/users.service';

/**
 * Создаёт стартовых пользователей (admin и manager) при запуске приложения.
 * Повторный запуск безопасен: существующие email пропускаются.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedUser(
      this.configService.get<string>('app.seed.admin.email'),
      this.configService.get<string>('app.seed.admin.password'),
      'admin',
      'Администратор',
    );
    await this.seedUser(
      this.configService.get<string>('app.seed.manager.email'),
      this.configService.get<string>('app.seed.manager.password'),
      'manager',
      'Менеджер',
    );
  }

  private async seedUser(
    email: string | undefined,
    password: string | undefined,
    role: UserRole,
    name: string,
  ): Promise<void> {
    if (!email || !password) {
      this.logger.warn(`No seed config for role "${role}", skipping`);
      return;
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return;
    }

    const passwordHash = await this.passwordService.hash(password);
    await this.usersService.create({ email, name, role, passwordHash });

    this.logger.log(`Created ${role} user: ${email}`);
  }
}
