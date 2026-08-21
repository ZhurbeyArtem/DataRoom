import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameItemDto {
  @ApiProperty({ example: 'nda-final.pdf' })
  @IsString()
  @MinLength(1, { message: 'Назва не може бути порожньою' })
  @MaxLength(255)
  name!: string;
}
