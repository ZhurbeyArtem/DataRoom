import type { Item } from '../../../common/prisma/client';
import type { ItemDto } from '../interfaces/item.interface';

/**
 * Item.size is a BigInt, and JSON.stringify throws
 * "Do not know how to serialize a BigInt" on it. Instead of patching the
 * prototype globally, the size is converted to a number here: files larger
 * than 9 petabytes are not a risk for us, and the frontend gets a plain
 * number.
 */
export function toItemDto(item: Item): ItemDto {
  return {
    id: item.id,
    dataRoomId: item.dataRoomId,
    parentId: item.parentId,
    type: item.type,
    name: item.name,
    size: item.size === null ? null : Number(item.size),
    mimeType: item.mimeType,
    status: item.status,
    deletedAt: item.deletedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
