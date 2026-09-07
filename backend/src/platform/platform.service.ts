import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { SchoolStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolsService } from '../schools/schools.service';
import { hashSecret } from '../common/crypto/password';
import { generatePassword } from '../common/crypto/codes';
import { daysUntil, effectiveStatus } from '../common/subscription';
import { formatAmount } from '../billing/pricing';
import { CreateSchoolDto, ExtendSchoolDto } from '../schools/dto/schools.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Панель владельца платформы: школы, сроки, деньги. Учебных данных школ —
 * работ, оценок, сканов — здесь нет и быть не должно: администратор платформы
 * видит только то, что нужно для обслуживания подписки.
 */
@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schools: SchoolsService,
  ) {}

  async overview() {
    const now = new Date();
    const soon = new Date(Date.now() + 14 * DAY_MS);

    const [schools, payments, expiringSoon] = await Promise.all([
      this.prisma.school.findMany({
        where: { deletedAt: null },
        select: { id: true, status: true, paidUntil: true, createdAt: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'SUCCEEDED' },
        select: { amount: true, succeededAt: true },
      }),
      this.prisma.school.count({
        where: { deletedAt: null, status: 'ACTIVE', paidUntil: { gt: now, lt: soon } },
      }),
    ]);

    const live = schools.map((school) => effectiveStatus(school));
    const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const monthAgo = new Date(Date.now() - 30 * DAY_MS);
    const revenueMonth = payments
      .filter((payment) => payment.succeededAt && payment.succeededAt >= monthAgo)
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      schools: {
        total: schools.length,
        trial: live.filter((status) => status === 'TRIAL').length,
        active: live.filter((status) => status === 'ACTIVE').length,
        expired: live.filter((status) => status === 'EXPIRED').length,
        blocked: live.filter((status) => status === 'BLOCKED').length,
        newThisMonth: schools.filter((school) => school.createdAt >= monthAgo).length,
        expiringSoon,
      },
      money: {
        total: revenue,
        totalLabel: formatAmount(revenue),
        month: revenueMonth,
        monthLabel: formatAmount(revenueMonth),
        payments: payments.length,
      },
    };
  }

  async list(filters: { status?: string; search?: string }) {
    const where: Prisma.SchoolWhereInput = {
      deletedAt: null,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { city: { contains: filters.search, mode: 'insensitive' } },
              { contactEmail: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const schools = await this.prisma.school.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { accounts: true, classes: true, assignments: true } },
        payments: { where: { status: 'SUCCEEDED' }, select: { amount: true } },
      },
    });

    return schools
      .map((school) => ({
        id: school.id,
        name: school.name,
        slug: school.slug,
        city: school.city,
        contactEmail: school.contactEmail,
        contactPhone: school.contactPhone,
        // Статус считаем по календарю: в базе может стоять ACTIVE у школы,
        // срок которой истёк ночью.
        status: effectiveStatus(school),
        paidUntil: school.paidUntil.toISOString(),
        daysLeft: daysUntil(school.paidUntil),
        note: school.note,
        createdAt: school.createdAt.toISOString(),
        counts: {
          accounts: school._count.accounts,
          classes: school._count.classes,
          assignments: school._count.assignments,
        },
        paid: school.payments.reduce((sum, payment) => sum + payment.amount, 0),
      }))
      .filter((school) => !filters.status || school.status === filters.status);
  }

  /** Школа, заведённая вручную: без оплаты, на указанный срок. */
  async createSchool(dto: CreateSchoolDto) {
    const months = dto.months ?? 12;
    return this.schools.create({
      name: dto.name,
      city: dto.city,
      adminLastName: dto.adminLastName,
      adminFirstName: dto.adminFirstName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      days: Math.round(months * 30.5),
      status: SchoolStatus.ACTIVE,
      note: dto.note ?? 'Заведена вручную',
    });
  }

  private async school(id: string) {
    const school = await this.prisma.school.findFirst({ where: { id, deletedAt: null } });
    if (!school) {
      throw new NotFoundException('Школа не найдена');
    }
    return school;
  }

  async extend(id: string, dto: ExtendSchoolDto) {
    await this.school(id);
    const paidUntil = await this.schools.extend(id, dto.months);
    if (dto.note) {
      await this.prisma.school.update({ where: { id }, data: { note: dto.note } });
    }
    return { paidUntil: paidUntil.toISOString(), daysLeft: daysUntil(paidUntil) };
  }

  async setBlocked(id: string, blocked: boolean) {
    const school = await this.school(id);
    await this.prisma.school.update({
      where: { id },
      data: {
        status: blocked
          ? SchoolStatus.BLOCKED
          : school.paidUntil.getTime() > Date.now()
            ? SchoolStatus.ACTIVE
            : SchoolStatus.EXPIRED,
      },
    });
    if (blocked) {
      // Закрытая школа не должна оставаться открытой в чужих вкладках.
      await this.prisma.authSession.updateMany({
        where: { account: { schoolId: id }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  }

  /** Директор потерял доступ: выдаём новый временный пароль его учётной записи. */
  async resetAdminPassword(id: string) {
    await this.school(id);
    const admin = await this.prisma.account.findFirst({
      where: { schoolId: id, role: 'SCHOOL_ADMIN', deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) {
      throw new NotFoundException('У школы нет администратора');
    }

    const temporaryPassword = generatePassword(12);
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: admin.id },
        data: {
          passwordHash: await hashSecret(temporaryPassword),
          mustChangePassword: true,
          tempPassword: temporaryPassword,
        },
      }),
      this.prisma.authSession.updateMany({
        where: { accountId: admin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { login: admin.login, temporaryPassword };
  }

  /**
   * Мягкое удаление школы: данные остаются в базе на случай спора и
   * восстановления, но платформа их больше не показывает.
   */
  async remove(id: string) {
    await this.school(id);
    await this.prisma.$transaction([
      this.prisma.school.update({ where: { id }, data: { deletedAt: new Date() } }),
      this.prisma.authSession.updateMany({
        where: { account: { schoolId: id }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  async payments(limit = 100) {
    const payments = await this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { school: { select: { id: true, name: true } } },
    });
    return payments.map((payment) => ({
      id: payment.id,
      externalId: payment.externalId,
      status: payment.status,
      amount: payment.amount,
      amountLabel: formatAmount(payment.amount),
      months: payment.months,
      schoolId: payment.school.id,
      schoolName: payment.school.name,
      payerEmail: payment.payerEmail,
      createdAt: payment.createdAt.toISOString(),
      succeededAt: payment.succeededAt?.toISOString() ?? null,
    }));
  }
}
