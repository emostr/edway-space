import { randomUUID } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toYooAmount } from './pricing';

const API = 'https://api.yookassa.ru/v3';

export interface CreatePaymentInput {
  amount: number;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  /** Почта плательщика: на неё ЮKassa отправит чек. */
  email?: string;
}

export interface YooPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: { value: string; currency: string };
  confirmationUrl: string | null;
  metadata: Record<string, string>;
  raw: unknown;
}

/**
 * Клиент кассы. Работает в двух режимах: настоящем — когда заданы ключи
 * магазина, и учебном — когда их нет. Учебный нужен не только для тестов:
 * платформу разворачивают в школе, где кассы может не быть вовсе, и путь
 * оплаты всё равно должен собираться и проверяться.
 */
@Injectable()
export class YooKassaClient {
  private readonly logger = new Logger('YooKassa');

  constructor(private readonly config: ConfigService) {}

  get shopId(): string {
    return (this.config.get<string>('YOOKASSA_SHOP_ID') ?? '').trim();
  }

  private get secretKey(): string {
    return (this.config.get<string>('YOOKASSA_SECRET_KEY') ?? '').trim();
  }

  /** Настоящая касса подключена только когда есть обе половины ключа. */
  get live(): boolean {
    return Boolean(this.shopId && this.secretKey);
  }

  /**
   * Нужно ли передавать состав чека. Самозанятому касса формирует чек сама —
   * через привязку к «Мой налог», и лишний состав в запросе она отвергает.
   * Включать это стоит только магазину, у которого подключено решение по
   * 54-ФЗ (онлайн-касса).
   */
  private get sendsReceipt(): boolean {
    const value = (this.config.get<string>('YOOKASSA_RECEIPT') ?? '').trim().toLowerCase();
    return value === 'on' || value === 'true' || value === '1';
  }

  private headers(idempotenceKey: string): Record<string, string> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      'Idempotence-Key': idempotenceKey,
      'Content-Type': 'application/json',
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<YooPayment> {
    if (!this.live) {
      // Учебный режим: платёж существует только у нас, подтверждается со
      // страницы-заглушки. Ни одной копейки при этом не двигается.
      const id = `test-${randomUUID()}`;
      return {
        id,
        status: 'pending',
        paid: false,
        amount: { value: toYooAmount(input.amount), currency: 'RUB' },
        confirmationUrl: `${input.returnUrl}?demo=1&payment=${id}`,
        metadata: input.metadata,
        raw: { test: true },
      };
    }

    const body: Record<string, unknown> = {
      amount: { value: toYooAmount(input.amount), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: input.returnUrl },
      description: input.description.slice(0, 128),
      metadata: input.metadata,
    };

    // Состав чека уходит только магазину с онлайн-кассой: см. sendsReceipt.
    if (this.sendsReceipt && input.email) {
      body.receipt = {
        customer: { email: input.email },
        items: [
          {
            description: input.description.slice(0, 128),
            quantity: '1.00',
            amount: { value: toYooAmount(input.amount), currency: 'RUB' },
            vat_code: 1,
            payment_mode: 'full_prepayment',
            payment_subject: 'service',
          },
        ],
      };
    }

    const response = await fetch(`${API}/payments`, {
      method: 'POST',
      headers: this.headers(randomUUID()),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    }).catch((error: Error) => {
      this.logger.error(`Касса недоступна: ${error.message}`);
      throw new ServiceUnavailableException('Платёжная система недоступна, попробуйте позже');
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      this.logger.error(`Касса отказала: ${response.status} ${JSON.stringify(data)}`);
      throw new ServiceUnavailableException('Не удалось создать платёж');
    }
    return this.toPayment(data);
  }

  /**
   * Перепроверка платежа у кассы. Уведомлению из сети мы не верим на слово:
   * подпись у ЮKassa не предусмотрена, поэтому статус подтверждаем запросом.
   */
  async getPayment(id: string): Promise<YooPayment | null> {
    if (!this.live) {
      return null;
    }

    const response = await fetch(`${API}/payments/${id}`, {
      headers: this.headers(randomUUID()),
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);

    if (!response?.ok) {
      return null;
    }
    return this.toPayment((await response.json()) as Record<string, unknown>);
  }

  private toPayment(data: Record<string, unknown>): YooPayment {
    const confirmation = data.confirmation as { confirmation_url?: string } | undefined;
    return {
      id: String(data.id),
      status: data.status as YooPayment['status'],
      paid: Boolean(data.paid),
      amount: data.amount as YooPayment['amount'],
      confirmationUrl: confirmation?.confirmation_url ?? null,
      metadata: (data.metadata ?? {}) as Record<string, string>,
      raw: data,
    };
  }
}
