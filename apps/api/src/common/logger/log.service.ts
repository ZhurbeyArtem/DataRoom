import { Injectable, Logger } from '@nestjs/common';
import { LogLevel } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../http/request-context';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class LogService {
  private readonly fallback = new Logger(LogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Записує один рядок у таблицю Log.
   * `name` — ім'я логу, `data` — його вміст, `ttl` — час життя в мілісекундах.
   * requestId дістається з контексту запиту, передавати його не треба.
   *
   * Помилка самого запису ніколи не валить запит: логер — діагностика,
   * а не частина бізнес-операції.
   */
  async register(name: string, data: string, ttl: number = TWO_WEEKS_MS): Promise<void> {
    try {
      await this.prisma.log.create({
        data: {
          name,
          message: data,
          level: LogLevel.ERROR,
          requestId: RequestContext.get()?.requestId,
          context: this.buildContext(),
          expiresAt: new Date(Date.now() + ttl),
        },
      });
    } catch (error) {
      this.fallback.error(`Не вдалося записати лог "${name}"`, error as Error);
    }
  }

  private buildContext(): { userId: string } | undefined {
    const userId = RequestContext.get()?.userId;
    return userId ? { userId } : undefined;
  }
}
