import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { ListItemsDto } from './dto/list-items.dto';
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
}
