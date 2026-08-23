import { BadRequestException } from '@nestjs/common';
import type { Item } from '../../../common/prisma/client';

/**
 * Moving a folder into itself or into its own subtree would detach the
 * branch from the root — it would become both unreachable and immune to the
 * delete cascade.
 */
export function assertNotDescendant(moved: Item, target: Item): void {
  if (moved.id === target.id) {
    throw new BadRequestException('A folder cannot be moved into itself');
  }

  if (target.path.includes(moved.id)) {
    throw new BadRequestException('A folder cannot be moved into its own subfolder');
  }
}
