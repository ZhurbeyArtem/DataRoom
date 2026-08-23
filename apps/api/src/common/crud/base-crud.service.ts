import { NotFoundException } from '@nestjs/common';
import { ListQueryDto } from './dto/list-query.dto';
import { decodeCursor, keysetWhere, KeysetField } from './cursor.util';

/* eslint-disable @typescript-eslint/no-explicit-any */
// The `any` here is deliberate and contained: this is the shape every Prisma
// delegate must match. Real types are handed back to subclasses through
// Parameters<...>, so no `any` leaks outwards.
export interface PrismaDelegate {
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  findFirst(args: any): Promise<any>;
  findMany(args: any): Promise<any[]>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface KeysetConfig {
  /** Sort fields in priority order. The last one must always be `id`. */
  fields: readonly KeysetField[];
  defaultLimit?: number;
}

export interface BuiltQuery {
  where: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'>[];
  take: number;
}

export abstract class BaseCrudService<TDelegate extends PrismaDelegate> {
  protected constructor(protected readonly model: TDelegate) {}

  create(args: Parameters<TDelegate['create']>[0]) {
    return this.model.create(args) as ReturnType<TDelegate['create']>;
  }

  update(args: Parameters<TDelegate['update']>[0]) {
    return this.model.update(args) as ReturnType<TDelegate['update']>;
  }

  delete(args: Parameters<TDelegate['delete']>[0]) {
    return this.model.delete(args) as ReturnType<TDelegate['delete']>;
  }

  findOne(args: Parameters<TDelegate['findFirst']>[0]) {
    return this.model.findFirst(args) as ReturnType<TDelegate['findFirst']>;
  }

  findMany(args?: Parameters<TDelegate['findMany']>[0]) {
    return this.model.findMany(args) as ReturnType<TDelegate['findMany']>;
  }

  /**
   * The same findOne, but throws NotFound instead of returning null.
   * Removes the identical three-line check from every service and guarantees
   * that "not found" looks the same everywhere.
   */
  async findOneWithError(
    args: Parameters<TDelegate['findFirst']>[0],
    message = 'Not found',
  ): Promise<NonNullable<Awaited<ReturnType<TDelegate['findFirst']>>>> {
    const found: unknown = await this.findOne(args);

    if (found === null || found === undefined) {
      throw new NotFoundException(message);
    }

    return found as NonNullable<Awaited<ReturnType<TDelegate['findFirst']>>>;
  }

  /**
   * Turns query parameters into Prisma arguments with cursor pagination.
   * Fetches one row more than asked for — that extra row is the signal that
   * a next page exists, without a separate count query.
   */
  queryBuilder(query: ListQueryDto, config: KeysetConfig): BuiltQuery {
    const limit = query.limit ?? config.defaultLimit ?? 50;

    // Always asc: that is the direction keysetWhere is built around.
    const where = query.cursor ? keysetWhere(decodeCursor(query.cursor)) : {};
    const orderBy = config.fields.map(({ field }) => ({ [field]: 'asc' as const }));

    return { where, orderBy, take: limit + 1 };
  }
}
