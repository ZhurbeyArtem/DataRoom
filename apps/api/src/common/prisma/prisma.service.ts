import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma 7 підключається через драйвер-адаптер, а не через url у схемі.
    // Рядок підключення в prisma.config.ts потрібен лише CLI для міграцій.
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // Пояс сесії обовʼязково UTC. Інакше Postgres віддає timestamptz
        // із локальним зсувом ("…16:52:27+03"), адаптер цей зсув губить
        // і трактує показання як UTC — усі дати в API зміщуються на
        // величину поясу. Симптом видно одразу: «видалено через 3 години».
        options: '-c timezone=UTC',
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
