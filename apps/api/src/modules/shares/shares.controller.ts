import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateShareDto } from './dto/create-share.dto';
import { RequireRole } from './decorators/require-role.decorator';
import { AccessGuard } from './guards/access.guard';
import type {
  ShareDto,
  SharedWithMeEntry,
  ShareTargetDto,
} from './interfaces/share.interface';
import { SharesService } from './shares.service';

@ApiTags('shares')
@ApiBearerAuth()
@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  // The only route that works on a token alone with no authorisation: a
  // link visitor first has to learn WHAT exactly was opened to them.
  @Get('shares/target')
  @ApiSecurity('share-token')
  @ApiOperation({ summary: 'The item a public link points at' })
  target(@Headers('x-share-token') token?: string): Promise<ShareTargetDto> {
    if (!token) throw new NotFoundException('This link is not valid');
    return this.shares.resolveByToken(token);
  }

  @Post('items/:id/shares')
  @UseGuards(JwtAuthGuard, AccessGuard)
  @RequireRole('OWNER')
  @ApiOperation({ summary: 'Share: a public link or a named grant' })
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
  @ApiOperation({ summary: 'Active shares of an item' })
  list(@Param('id', ParseUUIDPipe) id: string): Promise<ShareDto[]> {
    return this.shares.listForItem(id);
  }

  @Delete('shares/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a share' })
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.shares.revoke(id, user.id);
  }

  // A separate path rather than /data-rooms/shared-with-me: otherwise it
  // would clash with GET /data-rooms/:id and only work if the routes happened
  // to be registered in the right order.
  @Get('shares/with-me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'What has been shared with me by name' })
  sharedWithMe(@CurrentUser() user: AuthUser): Promise<SharedWithMeEntry[]> {
    return this.shares.listSharedWithMe(user.email);
  }
}
