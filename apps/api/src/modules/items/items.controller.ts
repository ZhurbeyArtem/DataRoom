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
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { Access } from '../shares/decorators/access.decorator';
import { RequireRole } from '../shares/decorators/require-role.decorator';
import { AccessGuard } from '../shares/guards/access.guard';
import type { AccessResult } from '../shares/interfaces/access.interface';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { ListItemsDto } from './dto/list-items.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import type { Breadcrumb, ItemDto, SubtreeStats } from './interfaces/item.interface';
import { ItemsService } from './items.service';

/**
 * Публічний глядач ходить у ті самі ендпоінти, що й власник — жодних
 * дублюючих /public/items. Запит несе або Bearer-токен, або X-Share-Token,
 * а AccessGuard зводить обидва випадки до однієї перевірки.
 */
@ApiTags('items')
@ApiBearerAuth()
@ApiSecurity('share-token')
@Controller('items')
export class ItemsController {
  constructor(
    private readonly items: ItemsService,
    private readonly rooms: DataRoomsService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('VIEWER')
  @ApiOperation({ summary: 'Вміст папки або кореня кімнати' })
  list(
    @Access() access: AccessResult,
    @Query() query: ListItemsDto,
  ): Promise<Paginated<ItemDto>> {
    return this.items.listChildren(access.item.id, query);
  }

  // Оголошений вище за @Get(':id') навмисно: інакше Nest спробує розібрати
  // слово "trash" як UUID і поверне 400 замість вмісту кошика.
  @Get('trash/:dataRoomId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Вміст кошика кімнати; лише власник' })
  async trash(
    @CurrentUser() user: AuthUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
  ): Promise<ItemDto[]> {
    await this.rooms.assertOwned(dataRoomId, user.id);
    return this.items.listTrash(dataRoomId, user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('VIEWER')
  @ApiOperation({ summary: 'Елемент разом із ланцюжком предків' })
  get(@Access() access: AccessResult): Promise<{
    item: ItemDto;
    breadcrumbs: Breadcrumb[];
  }> {
    return this.items.getWithBreadcrumbs(access.item);
  }

  @Get(':id/stats')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('VIEWER')
  @ApiOperation({ summary: 'Розмір і кількість елементів усього піддерева' })
  stats(@Access() access: AccessResult): Promise<SubtreeStats> {
    return this.items.getSubtreeStats(access.item);
  }

  @Post('folders')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Створити папку' })
  createFolder(
    @CurrentUser() user: AuthUser,
    @Access() access: AccessResult,
    @Body() dto: CreateFolderDto,
  ): Promise<ItemDto> {
    return this.items.createFolder(access.item, dto.name, user.id);
  }

  @Patch(':id')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Перейменувати; конфлікт імені розвʼязується суфіксом' })
  rename(@Access() access: AccessResult, @Body() dto: RenameItemDto): Promise<ItemDto> {
    return this.items.rename(access.item, dto.name);
  }

  @Post(':id/move')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Перемістити в іншу папку' })
  move(@Access() access: AccessResult, @Body() dto: MoveItemDto): Promise<ItemDto> {
    return this.items.move(access.item, dto.targetParentId);
  }

  @Delete(':id')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Перемістити в кошик разом із піддеревом' })
  remove(@Access() access: AccessResult): Promise<void> {
    return this.items.moveToTrash(access.item);
  }

  // Без AccessGuard: він шукає лише живі вузли, а тут ідеться саме про
  // видалений. Кошик — особиста корзина власника, ділитися нею не можна.
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Відновити з кошика; лише власник' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ItemDto> {
    return this.items.restore(id, user.id);
  }
}
