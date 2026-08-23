/**
 * A field the listing is ordered by and the cursor is built from.
 *
 * `order` is filled in for enum fields only: Prisma has no gt/lt for enums
 * (EnumFilter offers just equals, in, notIn, not), so "strictly after" is
 * expressed through `in` with the values that come later in the declared
 * order.
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

/** Enum values that come strictly after the given one in declared order. */
function valuesAfter(order: readonly string[], value: string): string[] {
  const index = order.indexOf(value);
  // Unknown value — better to return nothing than to return everything.
  return index === -1 ? [] : [...order.slice(index + 1)];
}

function strictlyAfter(field: CursorField): Record<string, unknown> {
  return field.order
    ? { in: valuesAfter(field.order, String(field.value)) }
    : { gt: field.value };
}

/**
 * Keyset predicate for an ordered set of fields.
 * For [type, name, id] it yields:
 *   type "after" c.type
 *   OR (type = c.type AND name > c.name)
 *   OR (type = c.type AND name = c.name AND id > c.id)
 * That is, "everything strictly after this row" in the same sort order.
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
 * Drops the extra probe row and builds the cursor from the last real one.
 * Called by services after a Prisma query built through queryBuilder.
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
