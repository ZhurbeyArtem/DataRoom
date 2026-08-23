import type { Item } from '../../../common/prisma/client';

export type AccessRole = 'OWNER' | 'VIEWER';

export interface Principal {
  userId?: string;
  email?: string;
  shareToken?: string;
}

export interface AccessResult {
  item: Item;
  role: AccessRole;
  /**
   * The highest node this requester is allowed to see at all.
   * For an owner that is the room root; for a viewer, the item the share was
   * issued on. Above it not even names may be shown: otherwise the ancestor
   * chain would reveal the structure of someone else's room.
   */
  scopeItemId: string;
}
