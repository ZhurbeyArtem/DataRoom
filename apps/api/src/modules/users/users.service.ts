import { ConflictException, Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { Prisma, User } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService extends BaseCrudService<Prisma.UserDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma.user);
  }

  /** Emails are always stored lowercased — this stands in for citext. */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Normalisation is hidden here so callers don't have to remember it.
   * If everyone called findOne directly, forgetting normalizeEmail once would
   * be enough for sign-in to stop finding a user who typed their email
   * capitalised.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email: UsersService.normalizeEmail(email) } });
  }

  async createLocal(input: { email: string; password: string; name: string }): Promise<User> {
    const email = UsersService.normalizeEmail(input.email);

    // The unique index on email is what actually prevents duplicates. This
    // explicit check exists only so that in the common case the user sees a
    // readable message instead of a database error.
    if (await this.findByEmail(email)) {
      throw new ConflictException('A user with this email already exists');
    }

    return this.create({
      data: {
        email,
        name: input.name,
        passwordHash: await hash(input.password, BCRYPT_ROUNDS),
      },
    });
  }

  verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return Promise.resolve(false);
    return compare(password, user.passwordHash);
  }
}
