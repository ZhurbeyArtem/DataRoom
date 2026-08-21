import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();

    // Той самий ідентифікатор бачить клієнт у заголовку, отримує тіло помилки
    // і зберігає таблиця Log — за ним скарга користувача зводиться до стеку.
    res.setHeader('X-Request-Id', requestId);

    RequestContext.run({ requestId }, () => next());
  }
}
