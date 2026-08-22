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
   * Найвищий вузол, який цьому запитувачу взагалі дозволено бачити.
   * Для власника — корінь кімнати, для глядача — той елемент, на який
   * видано доступ. Вище нього не можна показувати навіть назви: інакше
   * ланцюжок предків розкривав би структуру чужої кімнати.
   */
  scopeItemId: string;
}
