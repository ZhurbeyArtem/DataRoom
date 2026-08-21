export interface CursorField {
  field: string;
  value: string | number;
}

export function encodeCursor(fields: CursorField[]): string {
  return Buffer.from(JSON.stringify(fields)).toString('base64url');
}

export function decodeCursor(raw: string): CursorField[] {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed as CursorField[];
  } catch {
    throw new Error('Malformed cursor');
  }
}

/**
 * Keyset-предикат для впорядкованого набору полів.
 * Для [type, name, id] дає:
 *   type > c.type
 *   OR (type = c.type AND name > c.name)
 *   OR (type = c.type AND name = c.name AND id > c.id)
 * Тобто "усе, що йде строго після цього рядка" у тому ж порядку сортування.
 */
export function keysetWhere(fields: CursorField[]): Record<string, unknown> {
  return {
    OR: fields.map((_, index) => {
      const clause: Record<string, unknown> = {};
      for (const equal of fields.slice(0, index)) {
        clause[equal.field] = equal.value;
      }
      clause[fields[index].field] = { gt: fields[index].value };
      return clause;
    }),
  };
}

/**
 * Відрізає службовий "зайвий" рядок і збирає курсор із останнього реального.
 * Викликається сервісами після Prisma-запиту, побудованого через queryBuilder.
 */
export function toPage<T extends Record<string, unknown>>(
  rows: T[],
  limit: number,
  fields: string[],
): { data: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  if (!hasMore || data.length === 0) {
    return { data, nextCursor: null };
  }

  const last = data[data.length - 1];
  const cursorFields: CursorField[] = fields.map((field) => ({
    field,
    value: last[field] as string | number,
  }));

  return { data, nextCursor: encodeCursor(cursorFields) };
}
