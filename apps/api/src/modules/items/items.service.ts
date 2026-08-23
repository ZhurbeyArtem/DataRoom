import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { KeysetField, toPage } from '../../common/crud/cursor.util';
import type { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { Item, ItemStatus, ItemType, Prisma } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListItemsDto } from './dto/list-items.dto';
import { SearchItemsDto } from './dto/search-items.dto';
import { assertNotDescendant } from './helpers/assert-not-descendant.helper';
import { buildChildPath } from './helpers/build-item-path.helper';
import { resolveNameConflict } from './helpers/resolve-name-conflict.helper';
import { toItemDto } from './helpers/to-item-dto.helper';
import type {
  Breadcrumb,
  ItemDto,
  SearchResultItem,
  SubtreeStats,
} from './interfaces/item.interface';

/**
 * Sort order: folders first, then files, each group by name.
 * `order` is required here specifically: Prisma has no gt/lt for enums, so
 * "further along the order" for `type` is expressed as `in` with the list of
 * the values that follow.
 */
const KEYSET_FIELDS: readonly KeysetField[] = [
  { field: 'type', order: [ItemType.FOLDER, ItemType.FILE] },
  { field: 'name' },
  { field: 'id' },
];

/**
 * Methods take an already loaded Item rather than its id: AccessGuard checks
 * access and puts that row on the request. The service therefore neither
 * re-reads it from the database nor duplicates the permission check.
 */
@Injectable()
export class ItemsService extends BaseCrudService<Prisma.ItemDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.item);
  }

  async listChildren(parentId: string, query: ListItemsDto): Promise<Paginated<ItemDto>> {
    const limit = query.limit ?? 50;
    const built = this.queryBuilder(query, { fields: KEYSET_FIELDS });

    const rows = await this.findMany({
      where: {
        ...built.where,
        parentId,
        deletedAt: null,
        // Hides unfinished uploads: a file appears in the listing once it
        // actually exists in storage, not when someone started uploading it.
        status: ItemStatus.READY,
      },
      orderBy: built.orderBy,
      take: built.take,
    });

    const page = toPage(rows, limit, KEYSET_FIELDS);

    return { data: page.data.map(toItemDto), nextCursor: page.nextCursor };
  }

  /**
   * The ancestor chain is fetched with one query over the path array — that
   * is exactly why the path is stored materialised. Walking up by parentId
   * would cost as many queries as there are nesting levels.
   */
  async getWithBreadcrumbs(
    item: Item,
    scopeItemId: string,
  ): Promise<{
    item: ItemDto;
    breadcrumbs: Breadcrumb[];
  }> {
    // The delegate is used directly here rather than through the base
    // findMany: that wrapper declares its return type as
    // ReturnType<TDelegate['findMany']> and so loses the narrowing `select`
    // gives. Breadcrumbs only need id and name.
    const ancestors = await this.prisma.item.findMany({
      where: { id: { in: item.path } },
      select: { id: true, name: true },
    });

    // findMany with `in` guarantees no ordering, so the chain is rebuilt
    // from path — otherwise breadcrumbs would list ancestors at random.
    const byId = new Map(ancestors.map((row) => [row.id, row]));

    // Cut off everything above the permitted boundary. A viewer who was
    // given a nested folder must not even see the names of the folders above
    // it — otherwise the ancestor chain leaks the structure of someone
    // else's room.
    const from = item.path.indexOf(scopeItemId);
    const visiblePath = from === -1 ? [] : item.path.slice(from);

    const breadcrumbs = visiblePath
      .map((id) => byId.get(id))
      .filter((crumb): crumb is Breadcrumb => crumb !== undefined);

    return { item: toItemDto(item), breadcrumbs };
  }

  /**
   * One indexed query instead of recursion: `$2 = ANY(path)` hits the GIN
   * index. The node itself is excluded — the delete dialog is about what is
   * inside, not "and one more folder, the one you are deleting".
   */
  async getSubtreeStats(item: Item): Promise<SubtreeStats> {
    const [row] = await this.prisma.$queryRaw<
      { folders: bigint; files: bigint; bytes: bigint }[]
    >`
      SELECT
        count(*) FILTER (WHERE "type" = 'FOLDER') AS folders,
        count(*) FILTER (WHERE "type" = 'FILE')   AS files,
        coalesce(sum("size"), 0)                  AS bytes
      FROM "Item"
      WHERE "dataRoomId" = ${item.dataRoomId}::uuid
        AND ${item.id}::uuid = ANY("path")
        AND "deletedAt" IS NULL
        AND "status" = 'READY'
    `;

    return {
      folders: Number(row?.folders ?? 0),
      files: Number(row?.files ?? 0),
      bytes: Number(row?.bytes ?? 0),
    };
  }

  /**
   * Search spans the whole room rather than a single folder — hence the
   * filter on dataRoomId with no parentId. The cursor is the same as in the
   * listing, minus `type` in the key: ordering folders before files makes no
   * sense in search results.
   *
   * `contains` compiles to ILIKE '%q%', which the (dataRoomId, name) index
   * does not accelerate — but it does confine the scan to a single room, and
   * at the expected volumes that is enough. If it ever becomes a bottleneck,
   * the next step is a trigram GIN index, with no change to the schema or to
   * this service.
   */
  async search(query: SearchItemsDto): Promise<Paginated<SearchResultItem>> {
    const limit = query.limit ?? 30;
    const fields: readonly KeysetField[] = [{ field: 'name' }, { field: 'id' }];
    const built = this.queryBuilder(query, { fields, defaultLimit: 30 });

    const rows = await this.findMany({
      where: {
        ...built.where,
        dataRoomId: query.dataRoomId,
        deletedAt: null,
        status: ItemStatus.READY,
        name: { contains: query.q, mode: 'insensitive' },
      },
      orderBy: built.orderBy,
      take: built.take,
    });

    const page = toPage(rows, limit, fields);

    return {
      data: await this.attachLocations(page.data),
      nextCursor: page.nextCursor,
    };
  }

  /**
   * The names of every ancestor of every result are fetched in ONE query
   * rather than one per row: otherwise a page of 30 results would cost 30
   * extra queries.
   */
  private async attachLocations(items: Item[]): Promise<SearchResultItem[]> {
    const ancestorIds = [...new Set(items.flatMap((item) => item.path))];

    const ancestors = ancestorIds.length
      ? await this.prisma.item.findMany({
          where: { id: { in: ancestorIds } },
          select: { id: true, name: true },
        })
      : [];

    const byId = new Map(ancestors.map((row) => [row.id, row]));

    return items.map((item) => ({
      ...toItemDto(item),
      location: item.path
        .map((id) => byId.get(id))
        .filter((crumb): crumb is Breadcrumb => crumb !== undefined),
    }));
  }

  async createFolder(parent: Item, name: string, createdById: string): Promise<ItemDto> {
    this.assertFolder(parent);

    const free = await resolveNameConflict(this.prisma, parent.id, name);
    const { path, depth } = buildChildPath(parent);

    const created = await this.create({
      data: {
        dataRoomId: parent.dataRoomId,
        parentId: parent.id,
        path,
        depth,
        type: ItemType.FOLDER,
        name: free,
        createdById,
      },
    });

    return toItemDto(created);
  }

  async rename(item: Item, name: string): Promise<ItemDto> {
    if (item.parentId === null) {
      throw new BadRequestException('Rename the root folder through its data room');
    }

    const free = await resolveNameConflict(this.prisma, item.parentId, name, item.id);
    return toItemDto(await this.update({ where: { id: item.id }, data: { name: free } }));
  }

  /**
   * A move = a new parentId and path on the node itself, plus a rewritten
   * path prefix on every descendant. Both happen in one transaction: a
   * half-moved tree would be a worse state than an unmoved one.
   */
  async move(item: Item, targetParentId: string): Promise<ItemDto> {
    // The target is looked up within the same room, so no separate
    // permission check is needed: access to the item itself has already been
    // confirmed by the guard.
    const target = await this.loadFolderInRoom(targetParentId, item.dataRoomId);

    assertNotDescendant(item, target);

    if (item.parentId === target.id) return toItemDto(item);

    const name = await resolveNameConflict(this.prisma, target.id, item.name, item.id);
    const { path: newPath, depth: newDepth } = buildChildPath(target);
    const sliceFrom = item.path.length + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Descendants: replace the first item.path.length elements of the path
      // with the new prefix. Postgres slices arrays from 1, hence the +1.
      await tx.$executeRaw`
        UPDATE "Item"
        SET "path"  = ${newPath}::uuid[] || "path"[${sliceFrom}:],
            "depth" = coalesce(
              array_length(${newPath}::uuid[] || "path"[${sliceFrom}:], 1), 0)
        WHERE "dataRoomId" = ${item.dataRoomId}::uuid
          AND ${item.id}::uuid = ANY("path")
      `;

      return tx.item.update({
        where: { id: item.id },
        data: { parentId: target.id, path: newPath, depth: newDepth, name },
      });
    });

    return toItemDto(updated);
  }

  /** A soft delete covers the node and its entire subtree in one query. */
  async moveToTrash(item: Item): Promise<void> {
    if (item.parentId === null) {
      throw new BadRequestException(
        'The root folder cannot be deleted separately from its data room',
      );
    }

    // date_trunc to milliseconds is not cosmetic. Postgres now() has
    // microsecond precision while a JS Date holds milliseconds only, so a
    // value read back through Prisma would NEVER equal the stored one.
    // Restore (below) identifies a batch precisely by deletedAt equality.
    await this.prisma.$executeRaw`
      UPDATE "Item"
      SET "deletedAt" = date_trunc('milliseconds', now())
      WHERE "dataRoomId" = ${item.dataRoomId}::uuid
        AND ("id" = ${item.id}::uuid OR ${item.id}::uuid = ANY("path"))
        AND "deletedAt" IS NULL
    `;
  }

  /**
   * Restore and trash rely on an ownership check rather than the guard:
   * AccessGuard only looks for live nodes, and these are deleted ones by
   * definition. Sharing the trash is not something we intend to support — it
   * is the owner's personal bin.
   *
   * Only what disappeared together with this node comes back: a single
   * UPDATE stamps the same timestamp on every row of the batch, so an equal
   * deletedAt is what identifies the batch. A child deleted separately
   * earlier stays in the trash — otherwise restoring a parent would silently
   * bring back what the user deleted deliberately and on its own.
   */
  async restore(itemId: string, ownerId: string): Promise<ItemDto> {
    const item = await this.findOneWithError(
      { where: { id: itemId, deletedAt: { not: null }, dataRoom: { ownerId } } },
      'Item not found in the trash',
    );

    const parent = item.parentId
      ? await this.findOne({ where: { id: item.parentId, deletedAt: null } })
      : null;

    const restored = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Item"
        SET "deletedAt" = NULL
        WHERE "dataRoomId" = ${item.dataRoomId}::uuid
          AND ("id" = ${item.id}::uuid OR ${item.id}::uuid = ANY("path"))
          AND "deletedAt" = ${item.deletedAt}
      `;

      if (parent) {
        const name = await resolveNameConflict(
          this.prisma,
          parent.id,
          item.name,
          item.id,
        );
        return tx.item.update({ where: { id: item.id }, data: { name } });
      }

      const root = await tx.item.findFirstOrThrow({
        where: { dataRoomId: item.dataRoomId, parentId: null },
      });
      const name = await resolveNameConflict(this.prisma, root.id, item.name, item.id);
      const { path, depth } = buildChildPath(root);

      return tx.item.update({
        where: { id: item.id },
        data: { parentId: root.id, path, depth, name },
      });
    });

    return toItemDto(restored);
  }

  async listTrash(dataRoomId: string, ownerId: string): Promise<ItemDto[]> {
    const rows = await this.findMany({
      where: { dataRoomId, deletedAt: { not: null }, dataRoom: { ownerId } },
      orderBy: { deletedAt: 'desc' },
      take: 200,
    });

    return rows.map(toItemDto);
  }

  private assertFolder(item: Item): void {
    if (item.type !== ItemType.FOLDER) {
      throw new BadRequestException('Only a folder can be a parent');
    }
  }

  private async loadFolderInRoom(itemId: string, dataRoomId: string): Promise<Item> {
    const item = await this.findOne({
      where: { id: itemId, dataRoomId, deletedAt: null },
    });

    if (!item) throw new NotFoundException('Destination folder not found');
    this.assertFolder(item);

    return item;
  }
}
