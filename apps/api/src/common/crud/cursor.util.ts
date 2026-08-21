/**
 * Поле, за яким іде впорядкування й будується курсор.
 *
 * `order` заповнюється лише для enum-полів: Prisma не підтримує gt/lt для
 * enum (у EnumFilter є тільки equals, in, notIn, not), тому «строго після»
 * для них виражається через `in` із перелiком значень, що йдуть далі
 * в оголошеному порядку.
 */
export interface KeysetField {
  field: string;
  order?: readonly string[];
}

export interface CursorField extends KeysetField {
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

/** Значення enum, що йдуть строго після заданого в оголошеному порядку. */
function valuesAfter(order: readonly string[], value: string): string[] {
  const index = order.indexOf(value);
  // Невідоме значення — краще не повернути нічого, ніж повернути все.
  return index === -1 ? [] : [...order.slice(index + 1)];
}

function strictlyAfter(field: CursorField): Record<string, unknown> {
  return field.order
    ? { in: valuesAfter(field.order, String(field.value)) }
    : { gt: field.value };
}

/**
 * Keyset-предикат для впорядкованого набору полів.
 * Для [type, name, id] дає:
 *   type "після" c.type
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
      clause[fields[index].field] = strictlyAfter(fields[index]);
      return clause;
    }),
  };
}

/**
 * Відрізає службовий "зайвий" рядок і збирає курсор із останнього реального.
 * Викликається сервісами після Prisma-запиту, побудованого через queryBuilder.
 */
export function toPage<T>(
  rows: T[],
  limit: number,
  fields: readonly KeysetField[],
): { data: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  if (!hasMore || data.length === 0) {
    return { data, nextCursor: null };
  }

  const last = data[data.length - 1] as Record<string, unknown>;
  const cursorFields: CursorField[] = fields.map((field) => ({
    ...field,
    value: last[field.field] as string | number,
  }));

  return { data, nextCursor: encodeCursor(cursorFields) };
}
