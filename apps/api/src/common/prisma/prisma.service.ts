import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma 7 connects through a driver adapter rather than a url in the
    // schema. The connection string in prisma.config.ts is only needed by
    // the CLI for migrations.
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // The session time zone must be UTC. Otherwise Postgres returns
        // timestamptz with a local offset ("…16:52:27+03"), the adapter drops
        // that offset and reads the value as UTC — every date in the API
        // shifts by the offset. The symptom is immediate: "deleted in 3 hours".
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
