import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestTeacher, SESSION_COOKIE, SessionPayload } from '../types';

// lastSeenAt пишем не чаще раза в минуту — иначе каждый запрос дашборда
// превращается в UPDATE.
const TOUCH_INTERVAL_MS = 60_000;

type AuthedRequest = FastifyRequest & { teacher?: RequestTeacher };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Требуется вход в систему');
    }

    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      throw new UnauthorizedException('Сессия недействительна');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: { teacher: true },
    });

    const now = new Date();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < now ||
      session.teacher.deletedAt ||
      session.teacherId !== payload.sub
    ) {
      throw new UnauthorizedException('Сессия завершена');
    }

    request.teacher = {
      id: session.teacher.id,
      login: session.teacher.login,
      fullName: session.teacher.fullName,
      sessionId: session.id,
    };

    if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          lastSeenAt: now,
          ip: request.ip ?? '',
          userAgent: String(request.headers['user-agent'] ?? '').slice(0, 250),
        },
      });
    }

    return true;
  }
}
