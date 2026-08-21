import { NotFoundException } from '@nestjs/common';
import { ListQueryDto } from './dto/list-query.dto';
import { decodeCursor, keysetWhere } from './cursor.util';

/* eslint-disable @typescript-eslint/no-explicit-any */
// `any` тут навмисний і локалізований: це форма, якій мають відповідати всі
// делегати Prisma. Реальні типи повертаються нащадкам через Parameters<...>,
// тому назовні жодного `any` не витікає.
export interface PrismaDelegate {
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  findFirst(args: any): Promise<any>;
  findMany(args: any): Promise<any[]>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface KeysetConfig {
  /** Поля сортування в порядку пріоритету. Останнім завжди має бути `id`. */
  fields: string[];
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
   * Той самий findOne, але кидає NotFound замість повернення null.
   * Прибирає з кожного сервісу однаковий трирядковий блок перевірки
   * і гарантує, що "не знайдено" скрізь виглядає однаково.
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
   * Перетворює query-параметри на аргументи Prisma з курсорною пагінацією.
   * Бере на один рядок більше, ніж просили, — зайвий рядок і є ознакою,
   * що наступна сторінка існує, без окремого count-запиту.
   */
  queryBuilder(query: ListQueryDto, config: KeysetConfig): BuiltQuery {
    const order = query.order ?? 'asc';
    const limit = query.limit ?? config.defaultLimit ?? 50;

    const where = query.cursor ? keysetWhere(decodeCursor(query.cursor)) : {};
    const orderBy = config.fields.map((field) => ({ [field]: order }));

    return { where, orderBy, take: limit + 1 };
  }
}
