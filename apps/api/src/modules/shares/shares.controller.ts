import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateShareDto } from './dto/create-share.dto';
import { RequireRole } from './decorators/require-role.decorator';
import { AccessGuard } from './guards/access.guard';
import type { ShareDto, SharedWithMeEntry } from './interfaces/share.interface';
import { SharesService } from './shares.service';

@ApiTags('shares')
@ApiBearerAuth()
@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Post('items/:id/shares')
  @UseGuards(JwtAuthGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Поділитися: публічне посилання або поіменний доступ' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateShareDto,
  ): Promise<ShareDto> {
    return this.shares.createShare(id, user.id, dto);
  }

  @Get('items/:id/shares')
  @UseGuards(JwtAuthGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Активні доступи до елемента' })
  list(@Param('id', ParseUUIDPipe) id: string): Promise<ShareDto[]> {
    return this.shares.listForItem(id);
  }

  @Delete('shares/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Відкликати доступ' })
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.shares.revoke(id, user.id);
  }

  // Окремий шлях, а не /data-rooms/shared-with-me: інакше він конфліктував би
  // з GET /data-rooms/:id і працював би лише за вдалого порядку реєстрації.
  @Get('shares/with-me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Те, до чого мені надали доступ поіменно' })
  sharedWithMe(@CurrentUser() user: AuthUser): Promise<SharedWithMeEntry[]> {
    return this.shares.listSharedWithMe(user.email);
  }
}
