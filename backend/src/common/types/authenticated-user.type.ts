import type { User } from '../../users/entities/user.entity';

/**
 * Данные аутентифицированного пользователя, доступные WebSocket-слою.
 * Берутся только из проверенной сессии: пароль и прочие поля сюда не копируются.
 */
export type AuthenticatedUser = Pick<User, 'id' | 'role'>;
