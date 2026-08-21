import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessResult } from '../interfaces/access.interface';

/**
 * Віддає те, що вже завантажив AccessGuard. Завдяки цьому сервіси
 * отримують готовий Item і не читають його з БД удруге.
 */
export const Access = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessResult =>
    context.switchToHttp().getRequest<{ access: AccessResult }>().access,
);
