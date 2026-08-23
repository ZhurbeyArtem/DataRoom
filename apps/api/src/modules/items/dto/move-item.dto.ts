import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveItemDto {
  @ApiProperty({ description: 'Destination folder' })
  @IsUUID()
  targetParentId!: string;
}
