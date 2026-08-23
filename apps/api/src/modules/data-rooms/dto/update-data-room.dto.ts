import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Not PartialType(CreateDataRoomDto): a room has exactly one mutable field,
 * and making it optional would allow an empty PATCH that changes nothing yet
 * answers 200.
 */
export class UpdateDataRoomDto {
  @ApiProperty({ example: 'Acme Acquisition (updated)' })
  @IsString()
  @MinLength(1, { message: 'Room name cannot be empty' })
  @MaxLength(200)
  name!: string;
}
