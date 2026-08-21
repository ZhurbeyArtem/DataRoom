import { BadRequestException } from '@nestjs/common';
import type { Item } from '../../../common/prisma/client';

/**
 * Переміщення папки в саму себе або у власне піддерево відірвало б гілку
 * від кореня — вона стала б недосяжною й водночас незнищенною каскадом.
 */
export function assertNotDescendant(moved: Item, target: Item): void {
  if (moved.id === target.id) {
    throw new BadRequestException('Не можна перемістити папку в саму себе');
  }

  if (target.path.includes(moved.id)) {
    throw new BadRequestException('Не можна перемістити папку у власну підпапку');
  }
}
