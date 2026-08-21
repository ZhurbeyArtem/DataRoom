import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveItemDto {
  @ApiProperty({ description: 'Папка призначення' })
  @IsUUID()
  targetParentId!: string;
}
