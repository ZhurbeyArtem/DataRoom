import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { Prisma, Share, ShareType } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toItemDto } from '../items/helpers/to-item-dto.helper';
import { UsersService } from '../users/users.service';
import { CreateShareDto } from './dto/create-share.dto';
import type { ShareDto, SharedWithMeEntry } from './interfaces/share.interface';

@Injectable()
export class SharesService extends BaseCrudService<Prisma.ShareDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.share);
  }

  /**
   * Один рядок Share — це один спосіб доступу, а не один користувач.
   * Публічне посилання: токен є, адресата немає. Поіменний доступ: навпаки.
   * Обидва режими можуть існувати на одному Item одночасно; CHECK-констрейнт
   * у БД не дасть створити рядок-химеру.
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
        // 32 випадкові байти: вгадати такий токен перебором неможливо.
        token: isPublic ? randomBytes(32).toString('base64url') : null,
        granteeEmail: isPublic
          ? null
          : UsersService.normalizeEmail(dto.granteeEmail as string),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return toShareDto(share);
  }

  async listForItem(itemId: string): Promise<ShareDto[]> {
    const rows = await this.findMany({
      where: { itemId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toShareDto);
  }

  /**
   * Відкликання не видаляє рядок: має лишатися слід, що доступ був і його
   * забрали. Умова по ownerId — щоб чужий доступ не відкликав хтось інший.
   */
  async revoke(shareId: string, ownerId: string): Promise<void> {
    await this.prisma.share.updateMany({
      where: { id: shareId, revokedAt: null, item: { dataRoom: { ownerId } } },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Те, чим поділилися зі мною поіменно. Публічні посилання сюди не
   * потрапляють — вони нікому конкретно не адресовані.
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
