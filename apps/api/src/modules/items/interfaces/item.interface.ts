import type { ItemStatus, ItemType } from '../../../common/prisma/client';

export interface ItemDto {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  type: ItemType;
  name: string;
  size: number | null;
  mimeType: string | null;
  status: ItemStatus;
  /** Заповнено лише в кошику; у звичайному лістингу завжди null. */
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface SubtreeStats {
  folders: number;
  files: number;
  bytes: number;
}

/** Результат пошуку несе шлях розташування: без нього два однойменні
 * файли в різних папках неможливо розрізнити у списку. */
export interface SearchResultItem extends ItemDto {
  location: Breadcrumb[];
}
