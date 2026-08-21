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
