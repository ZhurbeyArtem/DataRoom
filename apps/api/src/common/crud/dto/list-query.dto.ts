import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Сортування навмисно не параметризоване. Порядок продуктовий — папки
 * поперед файлів, далі за іменем — і той самий порядок зашитий у курсор:
 * предикат «строго після» будується лише за зростанням. Параметр, який
 * міняв би напрямок, ламав би пагінацію, а не розширював її.
 */
export class ListQueryDto {
  @ApiPropertyOptional({ description: 'Курсор із попередньої сторінки' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
