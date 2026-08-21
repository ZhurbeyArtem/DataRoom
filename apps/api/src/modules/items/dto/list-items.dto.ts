import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/crud/dto/list-query.dto';

export class ListItemsDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'Папка, вміст якої показуємо' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Кімната; обовʼязкова, якщо parentId не задано' })
  @IsOptional()
  @IsUUID()
  dataRoomId?: string;
}
