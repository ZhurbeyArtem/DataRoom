import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

/** Той самий ліміт виставлено й на самому бакеті — сховище не покладається на нас. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export class CreateUploadUrlDto {
  @ApiProperty()
  @IsUUID()
  parentId!: string;

  @ApiProperty({ example: 'nda.pdf' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @ApiProperty({ maximum: MAX_FILE_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_BYTES, { message: 'Файл завеликий: максимум 50 МБ' })
  size!: number;
}
