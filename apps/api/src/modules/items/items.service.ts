import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { KeysetField, toPage } from '../../common/crud/cursor.util';
import type { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { Item, ItemStatus, ItemType, Prisma } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListItemsDto } from './dto/list-items.dto';
import { assertNotDescendant } from './helpers/assert-not-descendant.helper';
import { buildChildPath } from './helpers/build-item-path.helper';
import { resolveNameConflict } from './helpers/resolve-name-conflict.helper';
import { toItemDto } from './helpers/to-item-dto.helper';
import type { Breadcrumb, ItemDto, SubtreeStats } from './interfaces/item.interface';

/**
 * Порядок сортування: спершу папки, потім файли, всередині — за іменем.
 * order обовʼязковий саме тут: Prisma не вміє gt/lt для enum, тому «далі
 * за порядком» для type виражається через in зі списком наступних значень.
 */
const KEYSET_FIELDS: readonly KeysetField[] = [
  { field: 'type', order: [ItemType.FOLDER, ItemType.FILE] },
  { field: 'name' },
  { field: 'id' },
];

/**
 * Методи приймають уже завантажений Item, а не його id: доступ перевіряє
 * AccessGuard, і він же кладе цей рядок у запит. Тому сервіс не читає його
 * з БД удруге і не дублює перевірку прав.
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
        // Ховає незавершені аплоади: файл зʼявляється в списку тоді,
        // коли він реально є у сховищі, а не коли його почали вантажити.
        status: ItemStatus.READY,
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
  async getWithBreadcrumbs(item: Item): Promise<{
    item: ItemDto;
    breadcrumbs: Breadcrumb[];
  }> {
    // Тут делегат береться напряму, а не через базовий findMany: обгортка
    // оголошує тип повернення як ReturnType<TDelegate['findMany']> і через це
    // втрачає звуження від select. Для breadcrumbs потрібні лише id та name.
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
      throw new BadRequestException('Кореневу папку перейменовують через кімнату');
    }

    const free = await resolveNameConflict(this.prisma, item.parentId, name, item.id);
    return toItemDto(await this.update({ where: { id: item.id }, data: { name: free } }));
  }

  /**
   * Переміщення = новий parentId і новий path у самого вузла плюс переписаний
   * префікс path у всіх нащадків. Обидві дії в одній транзакції: наполовину
   * переміщене дерево було б гіршим станом, ніж непереміщене.
   */
  async move(item: Item, targetParentId: string): Promise<ItemDto> {
    // Ціль шукається в межах тієї ж кімнати, тому окрема перевірка прав
    // не потрібна: доступ до самого item уже підтверджено гвардом.
    const target = await this.loadFolderInRoom(targetParentId, item.dataRoomId);

    assertNotDescendant(item, target);

    if (item.parentId === target.id) return toItemDto(item);

    const name = await resolveNameConflict(this.prisma, target.id, item.name, item.id);
    const { path: newPath, depth: newDepth } = buildChildPath(target);
    const sliceFrom = item.path.length + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Нащадки: перші item.path.length елементів шляху міняємо на новий
      // префікс. Postgres нарізає масиви з одиниці, тому зріз із +1.
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

  /** Мʼяке видалення накриває вузол і все його піддерево одним запитом. */
  async moveToTrash(item: Item): Promise<void> {
    if (item.parentId === null) {
      throw new BadRequestException(
        'Кореневу папку не можна видалити окремо від кімнати',
      );
    }

    // date_trunc до мілісекунд — не косметика. now() у Postgres має
    // мікросекундну точність, а JS Date тримає лише мілісекунди, тому
    // прочитане через Prisma значення НІКОЛИ не дорівнювало б збереженому.
    // Відновлення (нижче) звіряє партію саме за рівністю deletedAt.
    await this.prisma.$executeRaw`
      UPDATE "Item"
      SET "deletedAt" = date_trunc('milliseconds', now())
      WHERE "dataRoomId" = ${item.dataRoomId}::uuid
        AND ("id" = ${item.id}::uuid OR ${item.id}::uuid = ANY("path"))
        AND "deletedAt" IS NULL
    `;
  }

  /**
   * Відновлення та кошик лишаються перевіркою власності, а не гвардом:
   * AccessGuard шукає лише живі вузли, а тут ідеться саме про видалені.
   * Ділитися кошиком ми й не збираємось — це особиста корзина власника.
   *
   * Піднімається лише те, що зникло разом із цим вузлом: один UPDATE
   * проставляє всім рядкам партії однаковий час, тому рівність deletedAt
   * і є ознакою партії. Дитина, яку видалили окремо раніше, лишається
   * в кошику — інакше відновлення батька мовчки повертало б те, що
   * користувач видаляв свідомо й окремо.
   */
  async restore(itemId: string, ownerId: string): Promise<ItemDto> {
    const item = await this.findOneWithError(
      { where: { id: itemId, deletedAt: { not: null }, dataRoom: { ownerId } } },
      'Елемент не знайдено в кошику',
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
      throw new BadRequestException('Батьком може бути лише папка');
    }
  }

  private async loadFolderInRoom(itemId: string, dataRoomId: string): Promise<Item> {
    const item = await this.findOne({
      where: { id: itemId, dataRoomId, deletedAt: null },
    });

    if (!item) throw new NotFoundException('Папку призначення не знайдено');
    this.assertFolder(item);

    return item;
  }
}
