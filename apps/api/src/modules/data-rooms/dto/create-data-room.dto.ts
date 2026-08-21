import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDataRoomDto {
  @ApiProperty({ example: 'Acme Acquisition' })
  @IsString()
  @MinLength(1, { message: 'Назва кімнати не може бути порожньою' })
  @MaxLength(200)
  name!: string;
}
