import { Module } from '@nestjs/common';
import { DataRoomsModule } from '../data-rooms/data-rooms.module';
import { SharesModule } from '../shares/shares.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [SharesModule, DataRoomsModule],
  controllers: [ItemsController, UploadsController],
  providers: [ItemsService, UploadsService],
  exports: [ItemsService],
})
export class ItemsModule {}
