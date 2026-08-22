import { Injectable, NotFoundException } from '@nestjs/common';
import { Item, ShareType } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AccessResult, Principal } from './interfaces/access.interface';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Єдина точка, що вирішує «можна чи ні». Дві гілки: власник кімнати
   * проходить одразу; решта — якщо на самому вузлі або на будь-якому
   * з його предків є живий Share.
   *
   * Відмова — завжди 404, ніколи 403: різниця між ними дозволила б
   * перебором зʼясувати, які документи існують у чужій кімнаті.
   */
  async resolve(itemId: string, principal: Principal): Promise<AccessResult> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
      include: { dataRoom: { select: { ownerId: true } } },
    });

    if (!item) throw new NotFoundException('Елемент не знайдено');

    if (principal.userId && item.dataRoom.ownerId === principal.userId) {
      // Власник бачить усе аж до кореня: перший елемент шляху або він сам.
      return { item, role: 'OWNER', scopeItemId: item.path[0] ?? item.id };
    }

    const share = await this.findLiveShare(item, principal);
    if (!share) throw new NotFoundException('Елемент не знайдено');

    return { item, role: 'VIEWER', scopeItemId: share.itemId };
  }

  /** Доступ до кімнати — це доступ до її кореневої папки. */
  async resolveForRoom(dataRoomId: string, principal: Principal): Promise<AccessResult> {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
      select: { rootItemId: true },
    });

    if (!room?.rootItemId) throw new NotFoundException('Кімнату не знайдено');

    return this.resolve(room.rootItemId, principal);
  }

  /**
   * chain = [item.id, ...item.path] — це і є успадкування доступу вниз
   * по дереву. Поділилися папкою, і все всередині відкривається тією ж
   * перевіркою, без рекурсії.
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
