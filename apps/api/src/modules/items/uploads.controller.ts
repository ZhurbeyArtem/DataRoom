import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import type { ItemDto } from './interfaces/item.interface';
import type { UploadTicket } from './interfaces/upload.interface';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('items')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Крок 1: підписаний URL і рядок у статусі PENDING' })
  createUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUploadUrlDto,
  ): Promise<UploadTicket> {
    return this.uploads.createUploadUrl(dto, user.id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Крок 3: звірка зі сховищем і перехід у READY' })
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ItemDto> {
    return this.uploads.confirmUpload(id, user.id);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Підписане посилання на читання, TTL 60 с' })
  downloadUrl(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ url: string }> {
    return this.uploads.createDownloadUrl(id, user.id);
  }
}
