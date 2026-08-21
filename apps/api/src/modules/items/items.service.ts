import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { KeysetField, toPage } from '../../common/crud/cursor.util';
import type { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { Item, ItemStatus, ItemType, Prisma } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListItemsDto } from './dto/list-items.dto';
import { toItemDto } from './helpers/to-item-dto.helper';
import type { Breadcrumb, ItemDto, SubtreeStats } from './interfaces/item.interface';

/**
 * Порядок сортування: спершу папки, потім файли, всередині — за іменем.
 * Папки йдуть першими тому, що ItemType оголошений як FOLDER, FILE —
 * Postgres сортує enum у порядку оголошення, а не за алфавітом.
 */
const KEYSET_FIELDS: readonly KeysetField[] = [
  // order обовʼязковий саме тут: Prisma не вміє gt/lt для enum, тому «далі
  // за порядком» для type виражається через in зі списком наступних значень.
  { field: 'type', order: [ItemType.FOLDER, ItemType.FILE] },
  { field: 'name' },
  { field: 'id' },
];

@Injectable()
export class ItemsService extends BaseCrudService<Prisma.ItemDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.item);
  }

  /**
   * Доступ поки перевіряється власністю кімнати через реляційний фільтр
   * dataRoom.ownerId — один запит, без окремої перевірки. У Задачі 9
   * це замінить AccessGuard, який додасть до власника ще й тих, кому
   * поділилися.
   */
  async listChildren(query: ListItemsDto, ownerId: string): Promise<Paginated<ItemDto>> {
    const parentId = await this.resolveParentId(query, ownerId);
    const limit = query.limit ?? 50;
    const built = this.queryBuilder(query, { fields: KEYSET_FIELDS });

    const rows = await this.findMany({
      where: {
        ...built.where,
        parentId,
        deletedAt: null,
        // Ховає незавершені аплоади: файл зʼявляється в списку тоді,
        // коли він реально є у сховищі, а не коли його почали вантажити.
        status: ItemStatus.READY,
        dataRoom: { ownerId },
      },
      orderBy: built.orderBy,
      take: built.take,
    });

    const page = toPage(rows, limit, KEYSET_FIELDS);

    return { data: page.data.map(toItemDto), nextCursor: page.nextCursor };
  }

  /**
   * Ланцюжок предків береться одним запитом по масиву path — саме заради
   * цього шлях і зберігається матеріалізованим. Прохід угору по parentId
   * коштував би стільки ж запитів, скільки рівнів вкладеності.
   */
  async getWithBreadcrumbs(
    itemId: string,
    ownerId: string,
  ): Promise<{ item: ItemDto; breadcrumbs: Breadcrumb[] }> {
    const item = await this.loadItemOrFail(itemId, ownerId);

    // Тут делегат береться напряму, а не через базовий findMany: обгортка
    // оголошує тип повернення як ReturnType<TDelegate['findMany']> і через це
    // втрачає звуження від select. Для breadcrumbs потрібні лише id та name,
    // тягнути повні рядки з path кожного предка було б марно.
    const ancestors = await this.prisma.item.findMany({
      where: { id: { in: item.path } },
      select: { id: true, name: true },
    });

    // findMany з `in` не гарантує порядку, тому ланцюжок перебудовується
    // за path — інакше breadcrumbs показували б предків навмання.
    const byId = new Map(ancestors.map((row) => [row.id, row]));
    const breadcrumbs = item.path
      .map((id) => byId.get(id))
      .filter((crumb): crumb is Breadcrumb => crumb !== undefined);

    return { item: toItemDto(item), breadcrumbs };
  }

  /**
   * Один індексований запит замість рекурсії: `$2 = ANY(path)` лягає
   * на GIN-індекс. Сам вузол виключений — у діалозі видалення цікавить,
   * що всередині, а не «і ще одна папка, та, яку ти видаляєш».
   */
  async getSubtreeStats(itemId: string, ownerId: string): Promise<SubtreeStats> {
    const item = await this.loadItemOrFail(itemId, ownerId);

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

  loadItemOrFail(itemId: string, ownerId: string): Promise<Item> {
    return this.findOneWithError(
      { where: { id: itemId, deletedAt: null, dataRoom: { ownerId } } },
      'Елемент не знайдено',
    );
  }

  /**
   * Лістинг просять або по конкретній папці, або по кімнаті — тоді показуємо
   * її корінь. Обидва варіанти зводяться до одного parentId.
   */
  private async resolveParentId(query: ListItemsDto, ownerId: string): Promise<string> {
    if (query.parentId) return query.parentId;

    if (!query.dataRoomId) {
      throw new BadRequestException('Потрібен parentId або dataRoomId');
    }

    const room = await this.prisma.dataRoom.findFirst({
      where: { id: query.dataRoomId, ownerId },
      select: { rootItemId: true },
    });

    if (!room?.rootItemId) {
      throw new BadRequestException('Кімнату не знайдено або в неї немає кореня');
    }

    return room.rootItemId;
  }
}
