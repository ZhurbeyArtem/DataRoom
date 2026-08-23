import type { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Returns a name that is free within the folder: report.pdf →
 * "report (1).pdf". The comparison is case-insensitive to match the partial
 * unique index built on lower(name).
 */
export async function resolveNameConflict(
  prisma: PrismaService,
  parentId: string,
  desiredName: string,
  excludeItemId?: string,
): Promise<string> {
  const taken = await prisma.item.findMany({
    where: {
      parentId,
      deletedAt: null,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
    select: { name: true },
  });

  const lowerTaken = new Set(taken.map((row) => row.name.toLowerCase()));
  if (!lowerTaken.has(desiredName.toLowerCase())) return desiredName;

  const { base, extension } = splitName(desiredName);

  for (let counter = 1; counter < 1000; counter += 1) {
    const candidate = `${base} (${counter})${extension}`;
    if (!lowerTaken.has(candidate.toLowerCase())) return candidate;
  }

  throw new Error(`Could not find a free name for "${desiredName}"`);
}

/**
 * dot <= 0 rather than dot === -1: a file named ".env" has its dot at
 * position 0, and splitting it into an empty base with extension ".env"
 * would be wrong.
 */
function splitName(name: string): { base: string; extension: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return { base: name, extension: '' };
  return { base: name.slice(0, dot), extension: name.slice(dot) };
}
