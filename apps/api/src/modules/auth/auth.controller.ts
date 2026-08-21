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
  @ApiOperation({ summary: 'Реєстрація за email і паролем' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return this.respond(await this.auth.register(dto), res);
  }

  @Post('login')
  @ApiOperation({ summary: 'Вхід за email і паролем' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return this.respond(await this.auth.login(dto), res);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Новий access-токен за refresh-cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return this.respond(await this.auth.refresh(this.readCookie(req)), res);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Вихід і відкликання сесії' })
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
  @ApiOperation({ summary: 'Поточний користувач' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  private readCookie(req: Request): string {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Сесія відсутня');
    return token;
  }

  /**
   * Refresh-токен не повертається в тілі — лише в httpOnly cookie, недосяжній
   * для JavaScript. Тому XSS на фронті не дає вкрасти довгоживучу сесію.
   * path звужує, куди браузер узагалі його відправляє.
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
