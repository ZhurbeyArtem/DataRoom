import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [ItemsController, UploadsController],
  providers: [ItemsService, UploadsService],
  exports: [ItemsService],
})
export class ItemsModule {}
