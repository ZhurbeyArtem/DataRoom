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
  /** Set only in the trash; always null in a normal listing. */
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

/** A search result carries its location path: without it two identically
 * named files in different folders cannot be told apart in the list. */
export interface SearchResultItem extends ItemDto {
  location: Breadcrumb[];
}
