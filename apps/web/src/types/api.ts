/** Response shapes shared across the whole API. */
export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
}

export type ItemType = 'FOLDER' | 'FILE';
export type ItemStatus = 'PENDING' | 'READY';
export type ShareType = 'PUBLIC_LINK' | 'USER_GRANT';
export type ShareRole = 'VIEWER';

export interface Item {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  type: ItemType;
  name: string;
  size: number | null;
  mimeType: string | null;
  status: ItemStatus;
  /** Set only in the trash; always null in a normal listing. */
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface SearchResultItem extends Item {
  location: Breadcrumb[];
}

export interface SubtreeStats {
  folders: number;
  files: number;
  bytes: number;
}

export interface DataRoom {
  id: string;
  name: string;
  ownerId: string;
  rootItemId: string | null;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AuthResult {
  accessToken: string;
  user: SessionUser;
}

export interface Share {
  id: string;
  itemId: string;
  type: ShareType;
  token: string | null;
  granteeEmail: string | null;
  role: ShareRole;
  expiresAt: string | null;
  createdAt: string;
}

export interface SharedWithMeEntry extends Share {
  item: Item;
}

export interface ShareTargetResponse {
  item: Item;
  dataRoomId: string;
}

export interface UploadTicket {
  itemId: string;
  storageKey: string;
  uploadUrl: string;
}

/**
 * Request bodies come from the schema generated out of Swagger rather than
 * being hand-written: renaming a field in a backend DTO breaks the frontend
 * build until it is fixed.
 *
 * Responses do not come from there: controllers return plain TS interfaces,
 * so Nest has nothing to build a response schema from. That is why the
 * shapes above are described by hand — a known gap, not an oversight.
 */
import type { components } from './api.gen';

export type RegisterInput = components['schemas']['RegisterDto'];
export type LoginInput = components['schemas']['LoginDto'];
export type CreateDataRoomInput = components['schemas']['CreateDataRoomDto'];
export type UpdateDataRoomInput = components['schemas']['UpdateDataRoomDto'];
export type CreateFolderInput = components['schemas']['CreateFolderDto'];
export type RenameItemInput = components['schemas']['RenameItemDto'];
export type MoveItemInput = components['schemas']['MoveItemDto'];
export type CreateUploadUrlInput = components['schemas']['CreateUploadUrlDto'];
export type CreateShareInput = components['schemas']['CreateShareDto'];
