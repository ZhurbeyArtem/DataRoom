import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import type { DataRoom } from '../../common/prisma/client';
import { DataRoomsService } from './data-rooms.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';

@ApiTags('data-rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly rooms: DataRoomsService) {}

  @Get()
  @ApiOperation({ summary: 'Мої кімнати' })
  list(@CurrentUser() user: AuthUser): Promise<DataRoom[]> {
    return this.rooms.listForOwner(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Створити кімнату разом із кореневою папкою' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDataRoomDto,
  ): Promise<DataRoom> {
    return this.rooms.createWithRoot(user.id, dto.name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Кімната за id' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DataRoom> {
    return this.rooms.assertOwned(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Перейменувати кімнату' })
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDataRoomDto,
  ): Promise<DataRoom> {
    return this.rooms.rename(id, user.id, dto.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити кімнату з усім вмістом' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.rooms.remove(id, user.id);
  }
}
