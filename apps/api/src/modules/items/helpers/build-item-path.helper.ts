import type { Item } from '../../../common/prisma/client';

/** Дитина успадковує шлях батька плюс самого батька. */
export function buildChildPath(parent: Item): { path: string[]; depth: number } {
  const path = [...parent.path, parent.id];
  return { path, depth: path.length };
}
