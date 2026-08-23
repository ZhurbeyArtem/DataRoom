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
   * Окремий cron-сервіс на безкоштовному Render недоступний, тому чистка
   * живе всередині процесу API.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    const logs = await this.prisma.log.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const uploads = await this.removeOrphanUploads();

    if (logs.count > 0 || uploads > 0) {
      this.logger.log(`Прибрано ${logs.count} логів і ${uploads} незавершених аплоадів`);
    }
  }

  /**
   * Аплоад, що не дійшов до confirm за годину, вважається обірваним.
   * Блоб видаляється ПЕРЕД рядком: якщо перше впаде, наступний прогін
   * спробує знову, а зникнення рядка залишило б файл у сховищі назавжди.
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
      // Рядки лишаються на місці — наступний прогін спробує ще раз.
      // Помилку вже записав StorageService.
      return 0;
    }

    const deleted = await this.prisma.item.deleteMany({
      where: { id: { in: orphans.map((row) => row.id) } },
    });

    return deleted.count;
  }
}
