import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Sorting is deliberately not parameterised. The order is a product decision
 * — folders before files, then by name — and the cursor is built around that
 * same order: the "strictly after" predicate only goes ascending. A parameter
 * flipping the direction would break pagination rather than extend it.
 */
export class ListQueryDto {
  @ApiPropertyOptional({ description: 'Cursor from the previous page' })
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
