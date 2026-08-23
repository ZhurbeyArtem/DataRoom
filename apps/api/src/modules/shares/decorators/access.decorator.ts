import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessResult } from '../interfaces/access.interface';

/**
 * Hands over what AccessGuard has already loaded. Thanks to this, services
 * receive a ready Item and never read it from the database a second time.
 */
export const Access = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessResult =>
    context.switchToHttp().getRequest<{ access: AccessResult }>().access,
);
