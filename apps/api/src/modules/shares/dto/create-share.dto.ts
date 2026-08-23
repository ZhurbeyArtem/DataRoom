import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { ShareType } from '../../../common/prisma/client';

export class CreateShareDto {
  @ApiProperty({ enum: ShareType, enumName: 'ShareType' })
  @IsEnum(ShareType)
  type!: ShareType;

  @ApiPropertyOptional({ description: 'Required for USER_GRANT' })
  @ValidateIf((dto: CreateShareDto) => dto.type === ShareType.USER_GRANT)
  @IsEmail({}, { message: 'Enter a valid recipient email address' })
  granteeEmail?: string;

  @ApiPropertyOptional({ description: 'ISO date; empty means never expires' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
