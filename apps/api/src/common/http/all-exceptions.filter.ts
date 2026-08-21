import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LogService } from '../logger/log.service';
import { RequestContext } from './request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logService: LogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = RequestContext.get()?.requestId ?? 'unknown';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Тільки серверні помилки варті запису: 4xx — це очікувана поведінка
    // (не знайдено, немає доступу, невалідне тіло), і вони засмітили б таблицю.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      void this.logService.register('http.exception', this.describe(exception, host));
    }

    response.status(status).json({
      code: HttpStatus[status] ?? 'ERROR',
      message: this.messageOf(exception),
      requestId,
    });
  }

  /**
   * ValidationPipe кладе перелік порушень у тіло відповіді, а не в message —
   * без цього розбору клієнт отримував би марне "Bad Request Exception"
   * замість "email must be an email".
   */
  private messageOf(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return 'Внутрішня помилка сервера';
    }

    const body = exception.getResponse();

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const detail = (body as { message: unknown }).message;
      if (Array.isArray(detail)) return detail.join('; ');
      if (typeof detail === 'string') return detail;
    }

    return exception.message;
  }

  private describe(exception: unknown, host: ArgumentsHost): string {
    const request = host.switchToHttp().getRequest<Request>();
    const stack = exception instanceof Error ? exception.stack : String(exception);
    return `${request.method} ${request.originalUrl}\n${stack ?? 'no stack'}`;
  }
}
