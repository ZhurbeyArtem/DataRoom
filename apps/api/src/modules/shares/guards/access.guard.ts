import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { AccessService } from '../access.service';
import { ACCESS_ROLE_KEY } from '../decorators/require-role.decorator';
import type { AccessResult, AccessRole, Principal } from '../interfaces/access.interface';

type GuardedRequest = Request & { user?: AuthUser; access?: AccessResult };

/**
 * Guards run BEFORE pipes, so the body and query arrive here exactly as they
 * were sent: a string, an array, an object. Passing that to Prisma means a
 * 500 and a Log row at the whim of anyone outside, so the shape of the id is
 * checked here.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asItemId(value: unknown): string | undefined {
  return typeof value === 'string' && UUID.test(value) ? value : undefined;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly access: AccessService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GuardedRequest>();

    const principal: Principal = {
      userId: request.user?.id,
      email: request.user?.email,
      shareToken: request.header('X-Share-Token') ?? undefined,
    };

    const result = await this.resolveTarget(request, principal);

    const required =
      this.reflector.getAllAndOverride<AccessRole>(ACCESS_ROLE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'VIEWER';

    // Again 404 rather than 403: a viewer must not be able to tell "no
    // permission" from "no such item".
    if (required === 'OWNER' && result.role !== 'OWNER') {
      throw new NotFoundException('Item not found');
    }

    request.access = result;
    return true;
  }

  /**
   * The target comes from three places because its shape differs: for
   * GET /items/:id it is a path parameter, for POST /items/folders the parent
   * folder in the body, for GET /items?parentId= a query parameter. The check
   * itself is the same in all three cases.
   */
  private resolveTarget(request: GuardedRequest, principal: Principal): Promise<AccessResult> {
    const params = request.params as Record<string, unknown>;
    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, unknown>;

    const itemId =
      asItemId(params.id) ?? asItemId(body?.parentId) ?? asItemId(query.parentId);

    if (itemId) return this.access.resolve(itemId, principal);

    // The root listing is requested by room — access to a room is access to
    // its root folder.
    const roomId = asItemId(query.dataRoomId);
    if (roomId) return this.access.resolveForRoom(roomId, principal);

    throw new NotFoundException('Item not found');
  }
}
