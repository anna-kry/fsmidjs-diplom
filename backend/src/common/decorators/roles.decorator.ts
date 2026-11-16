import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Помечает обработчик или контроллер ролями, которым он доступен. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
