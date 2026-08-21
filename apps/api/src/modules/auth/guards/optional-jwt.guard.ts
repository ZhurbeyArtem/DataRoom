import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Публічний глядач приходить без JWT, власник — з ним. Один гвард має
 * пропускати обох, тому відсутність токена тут не помилка, а анонім.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return (user || undefined) as TUser;
  }
}
