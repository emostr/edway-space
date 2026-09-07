import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountRole, SchoolStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { hashSecret } from '../common/crypto/password';
import { generatePassword } from '../common/crypto/codes';
import { buildLoginBase, titleCase, transliterate } from '../common/text';
import { TRIAL_DAYS } from '../common/types';
import { daysUntil, effectiveStatus } from '../common/subscription';
import { RegisterSchoolDto, UpdateSchoolDto } from './dto/schools.dto';

export interface SchoolCredentials {
  schoolId: string;
  schoolName: string;
  login: string;
  temporaryPassword: string;
  paidUntil: string;
  trialDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(name: string): Promise<string> {
    const base = transliterate(name).slice(0, 40) || 'school';
    let slug = base;
    let suffix = 1;
    while (await this.prisma.school.findUnique({ where: { slug }, select: { id: true } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  private async uniqueLogin(base: string): Promise<string> {
    let login = base;
    let suffix = 1;
    while (await this.prisma.account.findUnique({ where: { login }, select: { id: true } })) {
      suffix += 1;
      login = `${base}${suffix}`;
    }
    return login;
  }

  /**
   * Заводит школу вместе с её первым администратором. Одна и та же дорога и
   * для пробного периода с сайта, и для школы, заведённой вручную из панели
   * платформы, — различаются только срок и пометка.
   */
  async create(input: {
    name: string;
    city?: string;
    adminLastName: string;
    adminFirstName: string;
    contactEmail?: string;
    contactPhone?: string;
    days: number;
    status: SchoolStatus;
    note?: string;
  }): Promise<SchoolCredentials> {
    const name = input.name.trim();
    const fullName = titleCase(`${input.adminLastName} ${input.adminFirstName}`);
    const login = await this.uniqueLogin(buildLoginBase(fullName));
    const temporaryPassword = generatePassword(12);
    const paidUntil = new Date(Date.now() + input.days * DAY_MS);

    const school = await this.prisma.school.create({
      data: {
        name,
        slug: await this.uniqueSlug(name),
        city: (input.city ?? '').trim(),
        contactEmail: (input.contactEmail ?? '').trim().toLowerCase(),
        contactPhone: (input.contactPhone ?? '').trim(),
        status: input.status,
        paidUntil,
        note: (input.note ?? '').trim(),
        accounts: {
          create: {
            login,
            role: AccountRole.SCHOOL_ADMIN,
            fullName,
            passwordHash: await hashSecret(temporaryPassword),
            mustChangePassword: true,
            tempPassword: temporaryPassword,
          },
        },
      },
    });

    return {
      schoolId: school.id,
      schoolName: school.name,
      login,
      temporaryPassword,
      paidUntil: paidUntil.toISOString(),
      trialDays: input.days,
    };
  }

  /**
   * Регистрация с сайта: школа получает две недели знакомства. Оплата нужна
   * только к концу срока, поэтому директор успевает провести настоящую
   * контрольную и увидеть, работает ли автопроверка на его бумаге.
   */
  async register(dto: RegisterSchoolDto): Promise<SchoolCredentials> {
    if (!dto.acceptTerms) {
      throw new BadRequestException(
        'Без согласия с условиями и политикой обработки данных зарегистрировать школу нельзя',
      );
    }

    return this.create({
      name: dto.schoolName,
      city: dto.city,
      adminLastName: dto.lastName,
      adminFirstName: dto.firstName,
      contactEmail: dto.email,
      contactPhone: dto.phone,
      days: TRIAL_DAYS,
      status: SchoolStatus.TRIAL,
      note: 'Регистрация с сайта',
    });
  }

  /** Карточка школы для её администратора: сроки, состав, объём работы. */
  async detail(schoolId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, deletedAt: null },
      include: {
        _count: { select: { accounts: true, classes: true, tests: true, assignments: true } },
        payments: {
          where: { status: 'SUCCEEDED' },
          orderBy: { succeededAt: 'desc' },
          take: 12,
        },
      },
    });
    if (!school) {
      throw new NotFoundException('Школа не найдена');
    }

    return {
      id: school.id,
      name: school.name,
      slug: school.slug,
      city: school.city,
      contactEmail: school.contactEmail,
      contactPhone: school.contactPhone,
      status: effectiveStatus(school),
      paidUntil: school.paidUntil.toISOString(),
      daysLeft: daysUntil(school.paidUntil),
      createdAt: school.createdAt.toISOString(),
      counts: {
        accounts: school._count.accounts,
        classes: school._count.classes,
        tests: school._count.tests,
        assignments: school._count.assignments,
      },
      payments: school.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        months: payment.months,
        succeededAt: payment.succeededAt?.toISOString() ?? null,
        description: payment.description,
      })),
    };
  }

  async update(schoolId: string, dto: UpdateSchoolDto) {
    await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
        ...(dto.contactEmail !== undefined
          ? { contactEmail: dto.contactEmail.trim().toLowerCase() }
          : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone.trim() } : {}),
      },
    });
    return this.detail(schoolId);
  }

  /**
   * Продление после оплаты. Считаем от большей из двух дат: если школа платит
   * заранее, оплаченные дни не сгорают, а прибавляются к остатку.
   */
  async extend(schoolId: string, months: number): Promise<Date> {
    const school = await this.prisma.school.findFirstOrThrow({ where: { id: schoolId } });
    const from = school.paidUntil.getTime() > Date.now() ? school.paidUntil : new Date();
    const paidUntil = new Date(from);
    paidUntil.setMonth(paidUntil.getMonth() + months);

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { paidUntil, status: SchoolStatus.ACTIVE },
    });
    return paidUntil;
  }
}
