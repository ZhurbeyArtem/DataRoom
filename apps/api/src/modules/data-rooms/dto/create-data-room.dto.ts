import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDataRoomDto {
  @ApiProperty({ example: 'Acme Acquisition' })
  @IsString()
  @MinLength(1, { message: 'Room name cannot be empty' })
  @MaxLength(200)
  name!: string;
}
