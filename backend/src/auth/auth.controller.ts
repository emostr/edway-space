import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher, SESSION_COOKIE } from '../common/types';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private context(req: FastifyRequest) {
    return { ip: req.ip ?? '', userAgent: String(req.headers['user-agent'] ?? '').slice(0, 250) };
  }

  /**
   * Флаг Secure выставляем по схеме публичного адреса, а не по NODE_ENV.
   * Иначе платформа, поднятая по http (локальный docker compose), выдаёт
   * Secure-cookie, которую Safari молча выбрасывает: вход проходит, а все
   * последующие запросы получают 401.
   */
  private secureCookies(): boolean {
    return (this.config.get<string>('PUBLIC_URL') ?? '').startsWith('https://');
  }

  private setCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secureCookies(),
      path: '/',
      expires: expiresAt,
    });
  }

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.register(dto, this.context(req));
    this.setCookie(reply, result.token, result.expiresAt);
    return { login: result.login, profile: result.profile };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.login(dto.login, dto.password, this.context(req));
    this.setCookie(reply, result.token, result.expiresAt);
    return { profile: result.profile };
  }

  @Get('me')
  me(@CurrentTeacher() teacher: RequestTeacher) {
    return this.auth.profile(teacher.id);
  }

  @Patch('me')
  updateProfile(@CurrentTeacher() teacher: RequestTeacher, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(teacher.id, dto.fullName, dto.subject);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentTeacher() teacher: RequestTeacher, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.logout(teacher.sessionId);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Post('password')
  @HttpCode(200)
  async changePassword(@CurrentTeacher() teacher: RequestTeacher, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(teacher.id, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }

  @Get('sessions')
  listSessions(@CurrentTeacher() teacher: RequestTeacher) {
    return this.auth.listSessions(teacher.id, teacher.sessionId);
  }

  @Delete('sessions/:id')
  async revokeSession(@CurrentTeacher() teacher: RequestTeacher, @Param('id') id: string) {
    await this.auth.revokeSession(teacher.id, id);
    return { ok: true };
  }

  @Delete('sessions')
  revokeOthers(@CurrentTeacher() teacher: RequestTeacher) {
    return this.auth.revokeOtherSessions(teacher.id, teacher.sessionId);
  }

  /** Список коллег — из него выбирают, с кем поделиться тестом. */
  @Get('colleagues')
  colleagues(@CurrentTeacher() teacher: RequestTeacher) {
    return this.auth.colleagues(teacher.id);
  }
}
