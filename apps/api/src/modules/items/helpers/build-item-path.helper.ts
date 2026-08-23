import type { Item } from '../../../common/prisma/client';

/** A child inherits its parent's path plus the parent itself. */
export function buildChildPath(parent: Item): { path: string[]; depth: number } {
  const path = [...parent.path, parent.id];
  return { path, depth: path.length };
}
