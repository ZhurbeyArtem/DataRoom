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

  /** Email завжди зберігається в нижньому регістрі — це замінює citext. */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email: UsersService.normalizeEmail(email) } });
  }

  async createLocal(input: { email: string; password: string; name: string }): Promise<User> {
    const email = UsersService.normalizeEmail(input.email);

    // Від дубля захищає унікальний індекс на email. Явна перевірка потрібна
    // лише для того, щоб у типовому випадку користувач бачив зрозуміле
    // повідомлення, а не помилку БД.
    if (await this.findByEmail(email)) {
      throw new ConflictException('Користувач із таким email уже існує');
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
