import type { Item } from '../../../common/prisma/client';
import type { ItemDto } from '../interfaces/item.interface';

/**
 * Item.size має тип BigInt, а JSON.stringify на ньому кидає
 * "Do not know how to serialize a BigInt". Замість глобального патчу
 * прототипу конвертуємо розмір у number тут: файл більший за 9 петабайт
 * нам не загрожує, а фронт отримує звичайне число.
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
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
