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
}
