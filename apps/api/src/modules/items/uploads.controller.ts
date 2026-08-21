import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { Access } from '../shares/decorators/access.decorator';
import { RequireRole } from '../shares/decorators/require-role.decorator';
import { AccessGuard } from '../shares/guards/access.guard';
import type { AccessResult } from '../shares/interfaces/access.interface';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import type { ItemDto } from './interfaces/item.interface';
import type { UploadTicket } from './interfaces/upload.interface';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@ApiSecurity('share-token')
@Controller('items')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('upload-url')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Крок 1: підписаний URL і рядок у статусі PENDING' })
  createUploadUrl(
    @CurrentUser() user: AuthUser,
    @Access() access: AccessResult,
    @Body() dto: CreateUploadUrlDto,
  ): Promise<UploadTicket> {
    return this.uploads.createUploadUrl(access.item, dto, user.id);
  }

  @Post(':id/confirm')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Крок 3: звірка зі сховищем і перехід у READY' })
  confirm(@Access() access: AccessResult): Promise<ItemDto> {
    return this.uploads.confirmUpload(access.item);
  }

  // Читання, тому VIEWER: той, кому пошарили файл або папку над ним,
  // мусить мати змогу його відкрити.
  @Get(':id/download-url')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('VIEWER')
  @ApiOperation({ summary: 'Підписане посилання на читання, TTL 60 с' })
  downloadUrl(@Access() access: AccessResult): Promise<{ url: string }> {
    return this.uploads.createDownloadUrl(access.item);
  }
}
