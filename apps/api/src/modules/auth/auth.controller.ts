import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthResult, PublicUser } from './interfaces/auth-result.interface';
import type { AuthUser } from './interfaces/jwt-payload.interface';

const REFRESH_COOKIE = 'dr_refresh';
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Sign up with email and password' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return this.respond(await this.auth.register(dto), res);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return this.respond(await this.auth.login(dto), res);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'New access token from the refresh cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return this.respond(await this.auth.refresh(this.readCookie(req)), res);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Sign out and revoke the session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(this.readCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  private readCookie(req: Request): string {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('No session');
    return token;
  }

  /**
   * The refresh token is never returned in the body — only in an httpOnly
   * cookie that JavaScript cannot read. That way an XSS on the frontend
   * cannot steal the long-lived session. `path` narrows where the browser
   * sends it at all.
   */
  private respond(
    result: AuthResult,
    res: Response,
  ): { accessToken: string; user: PublicUser } {
    const isProduction = process.env.NODE_ENV === 'production';

    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/auth',
      maxAge: REFRESH_MAX_AGE_MS,
    };

    res.cookie(REFRESH_COOKIE, result.refreshToken, options);

    return { accessToken: result.accessToken, user: result.user };
  }
}
