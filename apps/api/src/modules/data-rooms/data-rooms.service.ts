import { Injectable } from '@nestjs/common';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { DataRoom, ItemType, Prisma } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

/** Supabase dislikes very long delete lists — send them in batches. */
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
   * A room and its root folder are created in a single transaction.
   * rootItemId is nullable in the schema precisely because of this cycle:
   * first the room, then the root that points at it, then the back-reference.
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
   * The single ownership check, used by other modules as well.
   * 404 rather than 403: the difference between them would let an attacker
   * enumerate which rooms exist in someone else's account.
   */
  assertOwned(roomId: string, ownerId: string): Promise<DataRoom> {
    return this.findOneWithError(
      { where: { id: roomId, ownerId } },
      'Data room not found',
    );
  }

  async rename(roomId: string, ownerId: string, name: string): Promise<DataRoom> {
    await this.assertOwned(roomId, ownerId);
    return this.update({ where: { id: roomId }, data: { name } });
  }

  /**
   * Rows are handled by onDelete: Cascade in the schema — Postgres removes
   * every Item and Share of this room itself. The blobs, however, have to be
   * collected BEFOREHAND: storageKey values disappear together with the rows,
   * after which the stored objects are unreachable forever — the background
   * cleanup only looks for unfinished uploads.
   *
   * Same ordering as in CleanupService: storage first, database second.
   * If storage fails, the room stays and the attempt can be retried — better
   * than losing the keys along with the rows.
   */
  async remove(roomId: string, ownerId: string): Promise<void> {
    await this.assertOwned(roomId, ownerId);

    // The trash is included: deleting a room is final, and soft-deleted
    // files should not outlive it.
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
