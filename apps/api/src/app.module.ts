import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { LogModule } from './common/logger/log.module';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';
import { TransformInterceptor } from './common/http/transform.interceptor';
import { RequestContextMiddleware } from './common/http/request-context.middleware';
import { CleanupService } from './common/jobs/cleanup.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DataRoomsModule } from './modules/data-rooms/data-rooms.module';
import { ItemsModule } from './modules/items/items.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LogModule,
    UsersModule,
    AuthModule,
    DataRoomsModule,
    ItemsModule,
    StorageModule,
  ],
  providers: [
    CleanupService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
