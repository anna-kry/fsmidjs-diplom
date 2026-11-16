import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Возвращает текущего аутентифицированного пользователя из запроса (req.user). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().user,
);
