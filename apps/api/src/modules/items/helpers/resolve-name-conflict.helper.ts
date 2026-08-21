import type { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Повертає імʼя, вільне в межах папки: report.pdf → "report (1).pdf".
 * Порівняння регістронезалежне, щоб збігатися з частковим унікальним
 * індексом, побудованим по lower(name).
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

  throw new Error(`Не вдалося підібрати вільне імʼя для "${desiredName}"`);
}

/**
 * dot <= 0, а не dot === -1: файл із іменем ".env" має крапку на позиції 0,
 * і різати його на порожню базу з розширенням ".env" було б неправильно.
 */
function splitName(name: string): { base: string; extension: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return { base: name, extension: '' };
  return { base: name.slice(0, dot), extension: name.slice(dot) };
}
