import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageService } from '../../modules/storage/storage.service';
import { ItemStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ORPHAN_UPLOAD_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * A separate cron service is not available on the free Render tier, so the
   * cleanup lives inside the API process.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    const logs = await this.prisma.log.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const uploads = await this.removeOrphanUploads();

    if (logs.count > 0 || uploads > 0) {
      this.logger.log(`Removed ${logs.count} logs and ${uploads} unfinished uploads`);
    }
  }

  /**
   * An upload that never reached confirm within an hour counts as abandoned.
   * The blob is deleted BEFORE the row: if that fails, the next run tries
   * again, whereas losing the row would strand the file in storage forever.
   */
  private async removeOrphanUploads(): Promise<number> {
    const orphans = await this.prisma.item.findMany({
      where: {
        status: ItemStatus.PENDING,
        createdAt: { lt: new Date(Date.now() - ORPHAN_UPLOAD_TTL_MS) },
      },
      select: { id: true, storageKey: true },
    });

    if (orphans.length === 0) return 0;

    try {
      await this.storage.remove(
        orphans
          .map((row) => row.storageKey)
          .filter((key): key is string => key !== null),
      );
    } catch {
      // Rows stay where they are — the next run will try again.
      // StorageService has already logged the failure.
      return 0;
    }

    const deleted = await this.prisma.item.deleteMany({
      where: { id: { in: orphans.map((row) => row.id) } },
    });

    return deleted.count;
  }
}
