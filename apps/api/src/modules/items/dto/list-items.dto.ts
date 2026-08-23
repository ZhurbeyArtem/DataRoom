import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/crud/dto/list-query.dto';

export class ListItemsDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'Folder whose contents to list' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Data room; required when parentId is omitted' })
  @IsOptional()
  @IsUUID()
  dataRoomId?: string;
}
