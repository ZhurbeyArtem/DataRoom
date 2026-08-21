import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateFolderDto } from './dto/create-folder.dto';
import { ListItemsDto } from './dto/list-items.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import type { Breadcrumb, ItemDto, SubtreeStats } from './interfaces/item.interface';
import { ItemsService } from './items.service';

@ApiTags('items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Вміст папки або кореня кімнати' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListItemsDto,
  ): Promise<Paginated<ItemDto>> {
    return this.items.listChildren(query, user.id);
  }

  // Оголошений вище за @Get(':id') навмисно: інакше Nest спробує розібрати
  // слово "trash" як UUID і поверне 400 замість вмісту кошика.
  @Get('trash/:dataRoomId')
  @ApiOperation({ summary: 'Вміст кошика кімнати' })
  trash(
    @CurrentUser() user: AuthUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
  ): Promise<ItemDto[]> {
    return this.items.listTrash(dataRoomId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Елемент разом із ланцюжком предків' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ item: ItemDto; breadcrumbs: Breadcrumb[] }> {
    return this.items.getWithBreadcrumbs(id, user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Розмір і кількість елементів усього піддерева' })
  stats(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubtreeStats> {
    return this.items.getSubtreeStats(id, user.id);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Створити папку' })
  createFolder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFolderDto,
  ): Promise<ItemDto> {
    return this.items.createFolder(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Перейменувати; конфлікт імені розвʼязується суфіксом' })
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameItemDto,
  ): Promise<ItemDto> {
    return this.items.rename(id, dto.name, user.id);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Перемістити в іншу папку' })
  move(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveItemDto,
  ): Promise<ItemDto> {
    return this.items.move(id, dto.targetParentId, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Перемістити в кошик разом із піддеревом' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.items.moveToTrash(id, user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Відновити з кошика' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ItemDto> {
    return this.items.restore(id, user.id);
  }
}
