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
import { SearchItemsDto } from './dto/search-items.dto';
import type {
  Breadcrumb,
  ItemDto,
  SearchResultItem,
  SubtreeStats,
} from './interfaces/item.interface';
import { ItemsService } from './items.service';

/**
 * A public viewer hits the same endpoints as the owner — there are no
 * duplicate /public/items routes. A request carries either a Bearer token or
 * an X-Share-Token, and AccessGuard reduces both cases to one check.
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
  @ApiOperation({ summary: 'Contents of a folder or of a room root' })
  list(
    @Access() access: AccessResult,
    @Query() query: ListItemsDto,
  ): Promise<Paginated<ItemDto>> {
    return this.items.listChildren(access.item.id, query);
  }

  // Declared above @Get(':id') on purpose: otherwise Nest would try to parse
  // the word "trash" as a UUID and answer 400 instead of the trash listing.
  @Get('trash/:dataRoomId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Trash contents of a room; owner only' })
  async trash(
    @CurrentUser() user: AuthUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
  ): Promise<ItemDto[]> {
    await this.rooms.assertOwned(dataRoomId, user.id);
    return this.items.listTrash(dataRoomId, user.id);
  }

  // Above @Get(':id') for the same reason: otherwise the word "search" would
  // reach ParseUUIDPipe. Search spans the whole room, so it relies on
  // ownership rather than AccessGuard — that guard works with a single node,
  // not with a room.
  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search by name within a room; owner only' })
  async search(
    @CurrentUser() user: AuthUser,
    @Query() query: SearchItemsDto,
  ): Promise<Paginated<SearchResultItem>> {
    await this.rooms.assertOwned(query.dataRoomId, user.id);
    return this.items.search(query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('VIEWER')
  @ApiOperation({ summary: 'An item together with its ancestor chain' })
  get(@Access() access: AccessResult): Promise<{
    item: ItemDto;
    breadcrumbs: Breadcrumb[];
  }> {
    return this.items.getWithBreadcrumbs(access.item, access.scopeItemId);
  }

  @Get(':id/stats')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('VIEWER')
  @ApiOperation({ summary: 'Total size and item count of the whole subtree' })
  stats(@Access() access: AccessResult): Promise<SubtreeStats> {
    return this.items.getSubtreeStats(access.item);
  }

  @Post('folders')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Create a folder' })
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
  @ApiOperation({ summary: 'Rename; a name clash is resolved with a suffix' })
  rename(@Access() access: AccessResult, @Body() dto: RenameItemDto): Promise<ItemDto> {
    return this.items.rename(access.item, dto.name);
  }

  @Post(':id/move')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Move into another folder' })
  move(@Access() access: AccessResult, @Body() dto: MoveItemDto): Promise<ItemDto> {
    return this.items.move(access.item, dto.targetParentId);
  }

  @Delete(':id')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Move to trash together with the subtree' })
  remove(@Access() access: AccessResult): Promise<void> {
    return this.items.moveToTrash(access.item);
  }

  // No AccessGuard: it only looks for live nodes, and this is about a
  // deleted one. The trash is the owner's personal bin and is not shareable.
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Restore from the trash; owner only' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ItemDto> {
    return this.items.restore(id, user.id);
  }
}
