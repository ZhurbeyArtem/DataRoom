import type { ShareRole, ShareType } from '../../../common/prisma/client';
import type { ItemDto } from '../../items/interfaces/item.interface';

export interface ShareDto {
  id: string;
  itemId: string;
  type: ShareType;
  token: string | null;
  granteeEmail: string | null;
  role: ShareRole;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface SharedWithMeEntry extends ShareDto {
  item: ItemDto;
}
