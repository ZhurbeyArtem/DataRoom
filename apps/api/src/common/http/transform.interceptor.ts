import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        // Сторінки вже мають форму { data, nextCursor } — загортати їх ще раз
        // означало б віддавати { data: { data, nextCursor } }.
        if (payload !== null && typeof payload === 'object' && 'nextCursor' in payload) {
          return payload;
        }
        return { data: payload };
      }),
    );
  }
}
