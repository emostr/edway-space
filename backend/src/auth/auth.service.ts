import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { hashSecret, verifySecret } from '../common/crypto/password';
import { buildLoginBase, titleCase } from '../common/text';
import { SessionPayload } from '../common/types';
import { RegisterDto } from './dto/auth.dto';

export interface TeacherProfile {
  id: string;
  login: string;
  fullName: string;
  subject: string;
  createdAt: string;
}

export interface SessionIssued {
  token: string;
  expiresAt: Date;
  profile: TeacherProfile;
}

export interface LoginContext {
  ip: string;
  userAgent: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private sessionDays(): number {
    return Number(this.config.get('SESSION_DAYS', 90));
  }

  /** Логин собирается транслитом; занят — добавляем номер. */
  private async uniqueLogin(base: string): Promise<string> {
    let login = base;
    let suffix = 1;
    while (await this.prisma.teacher.findUnique({ where: { login }, select: { id: true } })) {
      suffix += 1;
      login = `${base}${suffix}`;
    }
    return login;
  }

  /**
   * Регистрация свободная: платформа стоит внутри школы, отдельного
   * администратора у неё нет. Учитель вводит фамилию и имя, придумывает
   * пароль, логин ему выдаёт платформа.
   */
  async register(dto: RegisterDto, ctx: LoginContext): Promise<SessionIssued & { login: string }> {
    const fullName = titleCase(`${dto.lastName} ${dto.firstName}`);
    const login = await this.uniqueLogin(buildLoginBase(fullName));

    const teacher = await this.prisma.teacher.create({
      data: {
        login,
        passwordHash: await hashSecret(dto.password),
        fullName,
        subject: (dto.subject ?? '').trim(),
      },
    });

    const session = await this.issueSession(teacher.id, ctx);
    return { ...session, login };
  }

  async login(login: string, password: string, ctx: LoginContext): Promise<SessionIssued> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { login: login.trim().toLowerCase(), deletedAt: null },
    });
    // Сравниваем пароль даже для несуществующего логина — иначе по времени
    // ответа можно перебрать список пользователей.
    const stored = teacher?.passwordHash ?? (await this.dummyHash());
    const valid = await verifySecret(password, stored);
    if (!teacher || !valid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }
    return this.issueSession(teacher.id, ctx);
  }

  private dummyHashCache: string | null = null;

  private async dummyHash(): Promise<string> {
    if (!this.dummyHashCache) {
      this.dummyHashCache = await hashSecret('пароль-которого-нет');
    }
    return this.dummyHashCache;
  }

  private async issueSession(teacherId: string, ctx: LoginContext): Promise<SessionIssued> {
    const expiresAt = new Date(Date.now() + this.sessionDays() * 24 * 60 * 60 * 1000);
    const session = await this.prisma.authSession.create({
      data: { teacherId, expiresAt, ip: ctx.ip, userAgent: ctx.userAgent },
    });
    const payload: SessionPayload = { sid: session.id, sub: teacherId };
    const token = await this.jwt.signAsync(payload, { expiresIn: `${this.sessionDays()}d` });
    return { token, expiresAt, profile: await this.profile(teacherId) };
  }

  async profile(teacherId: string): Promise<TeacherProfile> {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, deletedAt: null } });
    if (!teacher) {
      throw new UnauthorizedException();
    }
    return {
      id: teacher.id,
      login: teacher.login,
      fullName: teacher.fullName,
      subject: teacher.subject,
      createdAt: teacher.createdAt.toISOString(),
    };
  }

  async updateProfile(teacherId: string, fullName?: string, subject?: string): Promise<TeacherProfile> {
    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        ...(fullName ? { fullName: titleCase(fullName) } : {}),
        ...(subject !== undefined ? { subject: subject.trim() } : {}),
      },
    });
    return this.profile(teacherId);
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(teacherId: string, currentPassword: string, newPassword: string): Promise<void> {
    const teacher = await this.prisma.teacher.findFirstOrThrow({ where: { id: teacherId, deletedAt: null } });
    if (!(await verifySecret(currentPassword, teacher.passwordHash))) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }
    if (await verifySecret(newPassword, teacher.passwordHash)) {
      throw new BadRequestException('Новый пароль должен отличаться от текущего');
    }
    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { passwordHash: await hashSecret(newPassword) },
    });
  }

  async listSessions(teacherId: string, currentSessionId: string) {
    const sessions = await this.prisma.authSession.findMany({
      where: { teacherId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      current: s.id === currentSessionId,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ip: s.ip,
      userAgent: s.userAgent,
    }));
  }

  async revokeSession(teacherId: string, sessionId: string): Promise<void> {
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, teacherId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Сессия не найдена');
    }
  }

  async revokeOtherSessions(teacherId: string, keepSessionId: string): Promise<{ revoked: number }> {
    const result = await this.prisma.authSession.updateMany({
      where: { teacherId, revokedAt: null, id: { not: keepSessionId } },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count };
  }

  /** Коллеги, которым можно передать тест. */
  async colleagues(teacherId: string) {
    const teachers = await this.prisma.teacher.findMany({
      where: { deletedAt: null, id: { not: teacherId } },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, login: true, subject: true },
    });
    return teachers;
  }
}
