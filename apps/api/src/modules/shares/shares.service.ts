import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { Prisma, Share, ShareType } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toItemDto } from '../items/helpers/to-item-dto.helper';
import { UsersService } from '../users/users.service';
import { CreateShareDto } from './dto/create-share.dto';
import type {
  ShareDto,
  SharedWithMeEntry,
  ShareTargetDto,
} from './interfaces/share.interface';

@Injectable()
export class SharesService extends BaseCrudService<Prisma.ShareDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.share);
  }

  /**
   * One Share row is one way in, not one user. A public link has a token and
   * no addressee; a named grant is the other way round. Both modes can exist
   * on the same Item at once, and a CHECK constraint in the database refuses
   * to create a chimera row.
   */
  async createShare(
    itemId: string,
    createdById: string,
    dto: CreateShareDto,
  ): Promise<ShareDto> {
    const isPublic = dto.type === ShareType.PUBLIC_LINK;

    const share = await this.create({
      data: {
        itemId,
        createdById,
        type: dto.type,
        // 32 random bytes: such a token cannot be brute-forced.
        token: isPublic ? randomBytes(32).toString('base64url') : null,
        granteeEmail: isPublic
          ? null
          : UsersService.normalizeEmail(dto.granteeEmail as string),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return toShareDto(share);
  }

  /**
   * A link visitor holds only the token — no item id, no room id. Without
   * this endpoint they could not even ask for a listing, since that requires
   * parentId or dataRoomId.
   */
  async resolveByToken(token: string): Promise<ShareTargetDto> {
    const now = new Date();

    const share = await this.prisma.share.findFirst({
      where: {
        type: ShareType.PUBLIC_LINK,
        token,
        revokedAt: null,
        item: { deletedAt: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { item: true },
    });

    // The same 404 as everywhere else: a revoked, an expired and a
    // non-existent link must be indistinguishable.
    if (!share) throw new NotFoundException('This link is not valid');

    return { item: toItemDto(share.item), dataRoomId: share.item.dataRoomId };
  }

  async listForItem(itemId: string): Promise<ShareDto[]> {
    const rows = await this.findMany({
      where: { itemId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toShareDto);
  }

  /**
   * Revoking does not delete the row: a trace that access existed and was
   * taken away has to remain. The ownerId condition keeps one person from
   * revoking someone else's grant.
   *
   * A zero count means one of three things: the grant does not exist, it
   * belongs to someone else, or it is already revoked. The answer to all
   * three is the same 404 as everywhere else; what matters is that it is not
   * "success". Otherwise the UI would report "access revoked" while the
   * grant is still live — for instance when the id went stale after a
   * refetch.
   */
  async revoke(shareId: string, ownerId: string): Promise<void> {
    const { count } = await this.prisma.share.updateMany({
      where: { id: shareId, revokedAt: null, item: { dataRoom: { ownerId } } },
      data: { revokedAt: new Date() },
    });

    if (count === 0) throw new NotFoundException('Share not found');
  }

  /**
   * What has been shared with me by name. Public links do not show up here —
   * they are not addressed to anyone in particular.
   */
  async listSharedWithMe(email: string): Promise<SharedWithMeEntry[]> {
    const rows = await this.prisma.share.findMany({
      where: {
        type: ShareType.USER_GRANT,
        granteeEmail: UsersService.normalizeEmail(email),
        revokedAt: null,
        item: { deletedAt: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({ ...toShareDto(row), item: toItemDto(row.item) }));
  }
}

function toShareDto(share: Share): ShareDto {
  return {
    id: share.id,
    itemId: share.itemId,
    type: share.type,
    token: share.token,
    granteeEmail: share.granteeEmail,
    role: share.role,
    expiresAt: share.expiresAt,
    createdAt: share.createdAt,
  };
}
