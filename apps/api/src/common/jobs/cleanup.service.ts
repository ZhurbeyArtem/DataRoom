import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ItemStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ORPHAN_UPLOAD_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Окремий cron-сервіс на безкоштовному Render недоступний, тому чистка
   * живе всередині процесу API.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    const logs = await this.prisma.log.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    // Аплоад, що не дійшов до confirm за годину, вважається обірваним.
    // Видалення блобів-сиріт зі сховища додається в Задачі 8.
    const uploads = await this.prisma.item.deleteMany({
      where: {
        status: ItemStatus.PENDING,
        createdAt: { lt: new Date(Date.now() - ORPHAN_UPLOAD_TTL_MS) },
      },
    });

    if (logs.count > 0 || uploads.count > 0) {
      this.logger.log(
        `Прибрано ${logs.count} логів і ${uploads.count} незавершених аплоадів`,
      );
    }
  }
}
