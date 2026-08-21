import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { ShareType } from '../../../common/prisma/client';

export class CreateShareDto {
  @ApiProperty({ enum: ShareType, enumName: 'ShareType' })
  @IsEnum(ShareType)
  type!: ShareType;

  @ApiPropertyOptional({ description: 'Обовʼязковий для USER_GRANT' })
  @ValidateIf((dto: CreateShareDto) => dto.type === ShareType.USER_GRANT)
  @IsEmail({}, { message: 'Вкажіть коректний email отримувача' })
  granteeEmail?: string;

  @ApiPropertyOptional({ description: 'ISO-дата; порожньо = безстроково' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
