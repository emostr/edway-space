import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { hashSecret } from './crypto/password';
import { generatePassword } from './crypto/codes';

/**
 * При первом запуске в базе нет никого, кроме администратора платформы.
 * Школ у него нет: он их заводит, продлевает и закрывает, но в учебные данные
 * не заглядывает.
 */
@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger('Bootstrap');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAdmin();
    await this.cleanupSessions();
  }

  private async ensureAdmin(): Promise<void> {
    const login = (this.config.get<string>('ADMIN_LOGIN') ?? 'admin').trim().toLowerCase();
    const existing = await this.prisma.account.findFirst({
      where: { role: AccountRole.PLATFORM_ADMIN, deletedAt: null },
    });
    if (existing) {
      return;
    }

    const configured = this.config.get<string>('ADMIN_PASSWORD');
    const password = configured?.trim() || generatePassword(16);

    await this.prisma.account.create({
      data: {
        login,
        passwordHash: await hashSecret(password),
        role: AccountRole.PLATFORM_ADMIN,
        fullName: 'Администратор платформы',
        mustChangePassword: true,
      },
    });

    this.logger.warn(
      [
        '',
        '  ────────────────────────────────────────────────',
        '  Создана учётная запись администратора платформы',
        `  Логин:  ${login}`,
        `  Пароль: ${password}`,
        '  При первом входе платформа потребует сменить пароль',
        '  и подключить второй фактор.',
        '  ────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
  }

  /** Просроченные и отозванные сессии копятся годами — подчищаем на старте. */
  private async cleanupSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.authSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
    });
    if (result.count > 0) {
      this.logger.log(`Удалено просроченных сессий: ${result.count}`);
    }
  }
}
