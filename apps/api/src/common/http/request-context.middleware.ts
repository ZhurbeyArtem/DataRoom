import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();

    // The client sees this same id in the header, gets it in the error body,
    // and the Log table stores it — that is what turns a user complaint into
    // a concrete stack trace.
    res.setHeader('X-Request-Id', requestId);

    RequestContext.run({ requestId }, () => next());
  }
}
