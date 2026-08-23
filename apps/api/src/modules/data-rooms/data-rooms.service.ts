import { Injectable } from '@nestjs/common';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { DataRoom, ItemType, Prisma } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

/** Supabase не любить надто довгих списків на видалення — ріжемо партіями. */
const REMOVE_BATCH = 100;

@Injectable()
export class DataRoomsService extends BaseCrudService<Prisma.DataRoomDelegate> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
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
   * Рядки прибирає onDelete: Cascade у схемі — Postgres сам стирає всі Item
   * і Share цієї кімнати. А от блоби доводиться зібрати ЗАЗДАЛЕГІДЬ: разом
   * із рядками зникають і storageKey, після чого об'єкти у сховищі стають
   * недосяжними назавжди — фонова чистка шукає лише незавершені аплоади.
   *
   * Порядок такий самий, як у CleanupService: спершу сховище, потім БД.
   * Якщо сховище відмовить, кімната лишиться на місці й спробу можна
   * повторити — це краще, ніж втратити ключі разом із рядками.
   */
  async remove(roomId: string, ownerId: string): Promise<void> {
    await this.assertOwned(roomId, ownerId);

    // Кошик сюди теж входить: видалення кімнати остаточне, і м'яко
    // видалені файли переживати її не мають.
    const files = await this.prisma.item.findMany({
      where: { dataRoomId: roomId, storageKey: { not: null } },
      select: { storageKey: true },
    });

    const keys = files
      .map((row) => row.storageKey)
      .filter((key): key is string => key !== null);

    for (let from = 0; from < keys.length; from += REMOVE_BATCH) {
      await this.storage.remove(keys.slice(from, from + REMOVE_BATCH));
    }

    await this.delete({ where: { id: roomId } });
  }
}
