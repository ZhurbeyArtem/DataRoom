import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ListQueryDto } from '../../../common/crud/dto/list-query.dto';

export class SearchItemsDto extends ListQueryDto {
  @ApiProperty({ description: 'Search covers the whole room, not a single folder' })
  @IsUUID()
  dataRoomId!: string;

  @ApiProperty({ example: 'nda' })
  @IsString()
  @MinLength(1, { message: 'Query cannot be empty' })
  @MaxLength(100)
  q!: string;
}
