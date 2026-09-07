import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { hashSecret } from '../common/crypto/password';
import { generatePassword } from '../common/crypto/codes';
import { buildLoginBase, titleCase } from '../common/text';
import { RequestAccount } from '../common/types';
import { CreateTeacherDto } from './dto/accounts.dto';

export interface AccountRow {
  id: string;
  login: string;
  fullName: string;
  subject: string;
  role: AccountRole;
  totpEnabled: boolean;
  mustChangePassword: boolean;
  /** Виден, пока учитель не сменил временный пароль. */
  tempPassword: string | null;
  activeSessions: number;
  lastSeenAt: string | null;
  createdAt: string;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueLogin(base: string): Promise<string> {
    let login = base;
    let suffix = 1;
    while (await this.prisma.account.findUnique({ where: { login }, select: { id: true } })) {
      suffix += 1;
      login = `${base}${suffix}`;
    }
    return login;
  }

  private toRow(
    account: {
      id: string;
      login: string;
      fullName: string;
      subject: string;
      role: AccountRole;
      totpEnabled: boolean;
      mustChangePassword: boolean;
      tempPassword: string | null;
      createdAt: Date;
    },
    activeSessions: number,
    lastSeenAt: Date | null,
  ): AccountRow {
    return {
      id: account.id,
      login: account.login,
      fullName: account.fullName,
      subject: account.subject,
      role: account.role,
      totpEnabled: account.totpEnabled,
      mustChangePassword: account.mustChangePassword,
      tempPassword: account.mustChangePassword ? account.tempPassword : null,
      activeSessions,
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
      createdAt: account.createdAt.toISOString(),
    };
  }

  async list(schoolId: string): Promise<AccountRow[]> {
    const now = new Date();
    const accounts = await this.prisma.account.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      include: {
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: now } },
          orderBy: { lastSeenAt: 'desc' },
          select: { lastSeenAt: true },
        },
      },
    });
    return accounts.map((account) =>
      this.toRow(account, account.sessions.length, account.sessions[0]?.lastSeenAt ?? null),
    );
  }

  /**
   * Учителя заводит администратор школы. Логин собирается транслитом, пароль
   * выдаётся временный и показывается один раз — дальше учитель меняет его сам.
   */
  async create(schoolId: string, dto: CreateTeacherDto) {
    const fullName = titleCase(`${dto.lastName} ${dto.firstName}`);
    const login = await this.uniqueLogin(buildLoginBase(fullName));
    const temporaryPassword = generatePassword(12);

    const created = await this.prisma.account.create({
      data: {
        schoolId,
        login,
        role: dto.role === 'SCHOOL_ADMIN' ? AccountRole.SCHOOL_ADMIN : AccountRole.TEACHER,
        fullName,
        subject: (dto.subject ?? '').trim(),
        passwordHash: await hashSecret(temporaryPassword),
        mustChangePassword: true,
        tempPassword: temporaryPassword,
      },
    });

    return { account: this.toRow(created, 0, null), temporaryPassword };
  }

  private async inSchool(schoolId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, schoolId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException('Сотрудник не найден');
    }
    return account;
  }

  async update(schoolId: string, accountId: string, fullName?: string, subject?: string) {
    await this.inSchool(schoolId, accountId);
    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        ...(fullName ? { fullName: titleCase(fullName) } : {}),
        ...(subject !== undefined ? { subject: subject.trim() } : {}),
      },
    });
    return this.toRow(updated, 0, null);
  }

  /** Выдаёт новый временный пароль и завершает все сессии сотрудника. */
  async resetPassword(schoolId: string, accountId: string) {
    await this.inSchool(schoolId, accountId);
    const temporaryPassword = generatePassword(12);
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: {
          passwordHash: await hashSecret(temporaryPassword),
          mustChangePassword: true,
          tempPassword: temporaryPassword,
        },
      }),
      this.prisma.authSession.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { temporaryPassword };
  }

  /** Учитель потерял телефон: сбрасываем второй фактор и резервные коды. */
  async resetTotp(schoolId: string, accountId: string) {
    await this.inSchool(schoolId, accountId);
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { totpEnabled: false, totpSecret: null },
      }),
      this.prisma.backupCode.deleteMany({ where: { accountId } }),
      this.prisma.authSession.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  /**
   * Мягкое удаление: тесты, назначения и оценки, сделанные учителем, остаются
   * в школе — иначе из журнала пропала бы половина года.
   */
  async remove(school: { id: string }, actor: RequestAccount, accountId: string) {
    if (actor.id === accountId) {
      throw new BadRequestException('Нельзя удалить собственную учётную запись');
    }
    const account = await this.inSchool(school.id, accountId);

    if (account.role === AccountRole.SCHOOL_ADMIN) {
      const admins = await this.prisma.account.count({
        where: { schoolId: school.id, role: AccountRole.SCHOOL_ADMIN, deletedAt: null },
      });
      if (admins <= 1) {
        throw new ForbiddenException('Это единственный администратор школы — школа останется без управления');
      }
    }

    const stamp = Date.now();
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { deletedAt: new Date(), login: `deleted.${stamp}.${accountId.slice(0, 6)}` },
      }),
      this.prisma.authSession.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}
