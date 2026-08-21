import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { AccessService } from '../access.service';
import { ACCESS_ROLE_KEY } from '../decorators/require-role.decorator';
import type { AccessResult, AccessRole, Principal } from '../interfaces/access.interface';

type GuardedRequest = Request & { user?: AuthUser; access?: AccessResult };

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

    // Знову 404, а не 403: глядач не має відрізняти «немає прав»
    // від «такого елемента не існує».
    if (required === 'OWNER' && result.role !== 'OWNER') {
      throw new NotFoundException('Елемент не знайдено');
    }

    request.access = result;
    return true;
  }

  /**
   * Ціль перевірки береться з трьох місць, бо вона різна за формою:
   * для GET /items/:id це параметр шляху, для POST /items/folders —
   * папка-батько в тілі, для GET /items?parentId= — параметр запиту.
   * Логіка перевірки при цьому одна.
   */
  private resolveTarget(request: GuardedRequest, principal: Principal): Promise<AccessResult> {
    const params = request.params as Record<string, string | undefined>;
    const body = request.body as Record<string, string | undefined> | undefined;
    const query = request.query as Record<string, string | undefined>;

    const itemId = params.id ?? body?.parentId ?? query.parentId;
    if (itemId) return this.access.resolve(itemId, principal);

    // Лістинг кореня просять по кімнаті — доступ до кімнати це доступ
    // до її кореневої папки.
    if (query.dataRoomId) return this.access.resolveForRoom(query.dataRoomId, principal);

    throw new NotFoundException('Елемент не знайдено');
  }
}
