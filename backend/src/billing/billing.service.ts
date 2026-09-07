import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { PaymentStatus, SchoolStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolsService } from '../schools/schools.service';
import { RequestAccount } from '../common/types';
import { formatAmount, yearPlan } from './pricing';
import { YooKassaClient } from './yookassa';
import { PurchaseDto } from './dto/billing.dto';

/** Сколько времени после оплаты можно забрать выданные логин и пароль. */
const CREDENTIALS_TTL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly schools: SchoolsService,
    private readonly kassa: YooKassaClient,
  ) {}

  private publicUrl(): string {
    return (this.config.get<string>('PUBLIC_URL') ?? 'http://localhost:8020').replace(/\/+$/, '');
  }

  plan() {
    const plan = yearPlan(this.config.get('PRICE_RUB'));
    return {
      ...plan,
      amountLabel: formatAmount(plan.amount),
      /** Учебный режим кассы честно показываем: иначе платёж выглядит настоящим. */
      live: this.kassa.live,
    };
  }

  /**
   * Покупка с сайта. Школа заводится сразу, но до оплаты не работает: так у
   * платежа есть чей-то адрес, а директор после возврата с кассы попадает
   * на страницу со своим логином, а не в пустоту.
   */
  async purchase(dto: PurchaseDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException(
        'Без согласия с условиями и политикой обработки данных оплата невозможна',
      );
    }

    const created = await this.schools.create({
      name: dto.schoolName,
      city: dto.city,
      adminLastName: dto.lastName,
      adminFirstName: dto.firstName,
      contactEmail: dto.email,
      contactPhone: dto.phone,
      // Ноль дней: школа существует, но до оплаты закрыта.
      days: 0,
      status: SchoolStatus.EXPIRED,
      note: 'Покупка с сайта',
    });

    const payment = await this.createPayment(created.schoolId, dto.email, created.schoolName);
    return { ...payment, schoolId: created.schoolId };
  }

  /** Продление из кабинета: школа уже есть, платит её администратор. */
  async checkout(account: RequestAccount, email?: string) {
    if (!account.school) {
      throw new BadRequestException('Оплата доступна только администратору школы');
    }
    const school = await this.prisma.school.findFirstOrThrow({
      where: { id: account.school.id, deletedAt: null },
    });
    return this.createPayment(school.id, email || school.contactEmail, school.name);
  }

  private async createPayment(schoolId: string, email: string | undefined, schoolName: string) {
    const plan = yearPlan(this.config.get('PRICE_RUB'));
    const description = `${plan.title} — ${schoolName}`;

    const created = await this.kassa.createPayment({
      amount: plan.amount,
      description,
      returnUrl: `${this.publicUrl()}/pay/result`,
      metadata: { schoolId, months: String(plan.months) },
      email,
    });

    await this.prisma.payment.create({
      data: {
        schoolId,
        externalId: created.id,
        status: PaymentStatus.PENDING,
        amount: plan.amount,
        months: plan.months,
        description,
        payerEmail: (email ?? '').toLowerCase(),
        payload: created.raw as Prisma.InputJsonValue,
      },
    });

    return {
      paymentId: created.id,
      confirmationUrl: created.confirmationUrl,
      amount: plan.amount,
      amountLabel: formatAmount(plan.amount),
      months: plan.months,
      live: this.kassa.live,
    };
  }

  /**
   * Уведомление от кассы. Ему на слово не верим: подписи у ЮKassa нет,
   * поэтому статус подтверждаем встречным запросом к API. В учебном режиме
   * запрашивать некого — там уведомление и есть источник истины.
   */
  async handleWebhook(body: unknown): Promise<{ ok: true }> {
    const event = body as { event?: string; object?: { id?: string; status?: string } };
    const id = event?.object?.id;
    if (!id) {
      throw new BadRequestException('Уведомление без платежа');
    }

    const payment = await this.prisma.payment.findUnique({ where: { externalId: id } });
    if (!payment) {
      // Чужой платёж или уведомление из другого магазина — молча пропускаем.
      this.logger.warn(`Уведомление о неизвестном платеже ${id}`);
      return { ok: true };
    }

    const confirmed = await this.kassa.getPayment(id);
    const status = confirmed?.status ?? event.object?.status;

    if (status === 'succeeded') {
      await this.markSucceeded(payment.id, confirmed?.raw ?? body);
    } else if (status === 'canceled') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CANCELED, payload: (confirmed?.raw ?? body) as Prisma.InputJsonValue },
      });
    }

    return { ok: true };
  }

  /** Учебный режим: подтверждение платежа со страницы возврата. */
  async confirmTestPayment(externalId: string): Promise<{ ok: boolean }> {
    if (this.kassa.live) {
      throw new BadRequestException('Настоящий платёж подтверждает касса');
    }
    const payment = await this.prisma.payment.findUnique({ where: { externalId } });
    if (!payment) {
      throw new NotFoundException('Платёж не найден');
    }
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      await this.markSucceeded(payment.id, { test: true, confirmedAt: new Date().toISOString() });
    }
    return { ok: true };
  }

  private async markSucceeded(paymentId: string, payload: unknown): Promise<void> {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    // Касса повторяет уведомление, пока не получит 200 — второй раз продлевать
    // подписку за те же деньги нельзя.
    if (payment.status === PaymentStatus.SUCCEEDED) {
      return;
    }

    const paidUntil = await this.schools.extend(payment.schoolId, payment.months);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        succeededAt: new Date(),
        payload: payload as Prisma.InputJsonValue,
      },
    });
    this.logger.log(
      `Оплата ${payment.externalId}: школа ${payment.schoolId} продлена до ${paidUntil.toISOString().slice(0, 10)}`,
    );
  }

  /**
   * Итог оплаты для страницы возврата. Пока администратор школы не сменил
   * временный пароль и с оплаты прошло меньше шести часов, отдаём выданные
   * логин и пароль: другого способа их узнать у покупателя нет.
   */
  async result(externalId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { externalId },
      include: {
        school: {
          include: {
            accounts: {
              where: { role: 'SCHOOL_ADMIN', deletedAt: null },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException('Платёж не найден');
    }

    const admin = payment.school.accounts[0];
    const fresh =
      payment.succeededAt !== null && Date.now() - payment.succeededAt.getTime() < CREDENTIALS_TTL_MS;

    return {
      status: payment.status,
      amountLabel: formatAmount(payment.amount),
      months: payment.months,
      school: {
        name: payment.school.name,
        paidUntil: payment.school.paidUntil.toISOString(),
      },
      credentials:
        fresh && admin?.mustChangePassword && admin.tempPassword
          ? { login: admin.login, temporaryPassword: admin.tempPassword }
          : null,
    };
  }

  /** История платежей школы — она же основание для бухгалтерии. */
  async history(schoolId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return payments.map((payment) => ({
      id: payment.id,
      externalId: payment.externalId,
      status: payment.status,
      amount: payment.amount,
      amountLabel: formatAmount(payment.amount),
      months: payment.months,
      description: payment.description,
      createdAt: payment.createdAt.toISOString(),
      succeededAt: payment.succeededAt?.toISOString() ?? null,
    }));
  }
}
