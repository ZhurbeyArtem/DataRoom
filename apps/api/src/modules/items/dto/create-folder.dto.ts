import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty()
  @IsUUID()
  parentId!: string;

  @ApiProperty({ example: 'Contracts' })
  @IsString()
  @MinLength(1, { message: 'Folder name cannot be empty' })
  @MaxLength(255)
  name!: string;
}
