import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Не PartialType(CreateDataRoomDto): у кімнати рівно одне змінюване поле,
 * і робити його необов'язковим означало б дозволити порожній PATCH,
 * який нічого не робить, але відповідає 200.
 */
export class UpdateDataRoomDto {
  @ApiProperty({ example: 'Acme Acquisition (updated)' })
  @IsString()
  @MinLength(1, { message: 'Назва кімнати не може бути порожньою' })
  @MaxLength(200)
  name!: string;
}
