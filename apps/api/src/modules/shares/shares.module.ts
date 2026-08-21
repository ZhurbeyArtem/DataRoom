import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { AccessGuard } from './guards/access.guard';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  controllers: [SharesController],
  providers: [AccessService, AccessGuard, SharesService],
  exports: [AccessService, AccessGuard],
})
export class SharesModule {}
