import { Injectable } from '@nestjs/common';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { DataRoom, ItemType, Prisma } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DataRoomsService extends BaseCrudService<Prisma.DataRoomDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.dataRoom);
  }

  listForOwner(ownerId: string): Promise<DataRoom[]> {
    return this.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Кімната і її коренева папка створюються однією транзакцією.
   * rootItemId нульований у схемі саме через цю циклічність: спершу кімната,
   * потім корінь, який на неї посилається, потім зворотне посилання.
   */
  createWithRoot(ownerId: string, name: string): Promise<DataRoom> {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.dataRoom.create({ data: { name, ownerId } });

      const root = await tx.item.create({
        data: {
          dataRoomId: room.id,
          parentId: null,
          path: [],
          depth: 0,
          type: ItemType.FOLDER,
          name,
          createdById: ownerId,
        },
      });

      return tx.dataRoom.update({
        where: { id: room.id },
        data: { rootItemId: root.id },
      });
    });
  }

  /**
   * Єдина точка перевірки власності, якою користуються й інші модулі.
   * 404, а не 403: різниця між ними дозволила б перебором з'ясувати,
   * які кімнати існують у чужому акаунті.
   */
  assertOwned(roomId: string, ownerId: string): Promise<DataRoom> {
    return this.findOneWithError(
      { where: { id: roomId, ownerId } },
      'Кімнату не знайдено',
    );
  }

  async rename(roomId: string, ownerId: string, name: string): Promise<DataRoom> {
    await this.assertOwned(roomId, ownerId);
    return this.update({ where: { id: roomId }, data: { name } });
  }

  /**
   * Видалення спирається на onDelete: Cascade у схемі — Postgres сам прибирає
   * всі Item і Share цієї кімнати. Ручний обхід дерева був би і повільнішим,
   * і менш надійним. Блоби зі сховища прибирає фонова задача.
   */
  async remove(roomId: string, ownerId: string): Promise<void> {
    await this.assertOwned(roomId, ownerId);
    await this.delete({ where: { id: roomId } });
  }
}
