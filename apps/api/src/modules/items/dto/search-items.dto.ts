import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ListQueryDto } from '../../../common/crud/dto/list-query.dto';

export class SearchItemsDto extends ListQueryDto {
  @ApiProperty({ description: 'Пошук іде по всій кімнаті, а не по одній папці' })
  @IsUUID()
  dataRoomId!: string;

  @ApiProperty({ example: 'nda' })
  @IsString()
  @MinLength(1, { message: 'Запит не може бути порожнім' })
  @MaxLength(100)
  q!: string;
}
