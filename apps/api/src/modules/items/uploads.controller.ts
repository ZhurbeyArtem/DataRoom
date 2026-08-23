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
  @ApiOperation({ summary: 'Step 1: a signed URL and a row in PENDING status' })
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
  @ApiOperation({ summary: 'Step 3: verification against storage and transition to READY' })
  confirm(@Access() access: AccessResult): Promise<ItemDto> {
    return this.uploads.confirmUpload(access.item);
  }

  // A read, hence VIEWER: whoever was given the file, or a folder above it,
  // must be able to open it.
  @Get(':id/download-url')
  @UseGuards(OptionalJwtGuard, AccessGuard)
  @RequireRole('VIEWER')
  @ApiOperation({ summary: 'Signed read link, 60-second TTL' })
  downloadUrl(@Access() access: AccessResult): Promise<{ url: string }> {
    return this.uploads.createDownloadUrl(access.item);
  }
}
