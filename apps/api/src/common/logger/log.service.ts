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
   * Writes a single row into the Log table.
   * `name` is the log name, `data` its payload, `ttl` its lifetime in ms.
   * requestId is taken from the request context, no need to pass it in.
   *
   * A failure to write never breaks the request: logging is diagnostics,
   * not part of the business operation.
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
      this.fallback.error(`Failed to write log "${name}"`, error as Error);
    }
  }

  private buildContext(): { userId: string } | undefined {
    const userId = RequestContext.get()?.userId;
    return userId ? { userId } : undefined;
  }
}
