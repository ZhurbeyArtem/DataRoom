import { Injectable, NotFoundException } from '@nestjs/common';
import { Item, ShareType } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AccessResult, Principal } from './interfaces/access.interface';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The single point that decides "allowed or not". Two branches: the room
   * owner passes immediately; everyone else passes if a live Share exists on
   * the node itself or on any of its ancestors.
   *
   * A refusal is always 404, never 403: the difference between them would
   * let someone enumerate which documents exist in another user's room.
   */
  async resolve(itemId: string, principal: Principal): Promise<AccessResult> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
      include: { dataRoom: { select: { ownerId: true } } },
    });

    if (!item) throw new NotFoundException('Item not found');

    if (principal.userId && item.dataRoom.ownerId === principal.userId) {
      // An owner sees everything up to the root: the first path element, or
      // the node itself.
      return { item, role: 'OWNER', scopeItemId: item.path[0] ?? item.id };
    }

    const share = await this.findLiveShare(item, principal);
    if (!share) throw new NotFoundException('Item not found');

    return { item, role: 'VIEWER', scopeItemId: share.itemId };
  }

  /** Access to a room is access to its root folder. */
  async resolveForRoom(dataRoomId: string, principal: Principal): Promise<AccessResult> {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
      select: { rootItemId: true },
    });

    if (!room?.rootItemId) throw new NotFoundException('Data room not found');

    return this.resolve(room.rootItemId, principal);
  }

  /**
   * chain = [item.id, ...item.path] — this is what makes access inherit down
   * the tree. Share a folder and everything inside opens through the same
   * check, with no recursion.
   */
  private findLiveShare(item: Item, principal: Principal) {
    const chain = [item.id, ...item.path];
    const modes: Record<string, unknown>[] = [];

    if (principal.shareToken) {
      modes.push({ type: ShareType.PUBLIC_LINK, token: principal.shareToken });
    }
    if (principal.email) {
      modes.push({ type: ShareType.USER_GRANT, granteeEmail: principal.email });
    }
    if (modes.length === 0) return Promise.resolve(null);

    return this.prisma.share.findFirst({
      where: {
        itemId: { in: chain },
        revokedAt: null,
        OR: modes,
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      },
    });
  }
}
