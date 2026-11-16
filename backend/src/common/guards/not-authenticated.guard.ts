import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Пропускает только гостей (неаутентифицированных).
 * Уже вошедший пользователь получает 403 — например, повторный логин
 * или повторная регистрация.
 */
@Injectable()
export class NotAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.isAuthenticated()) {
      throw new ForbiddenException();
    }

    return true;
  }
}
