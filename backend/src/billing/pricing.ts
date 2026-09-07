/**
 * Тариф один: школа платит за себя целиком, без счёта учителей и учеников.
 * Так директору проще планировать бюджет, а нам — объяснять цену.
 */
export interface Plan {
  code: 'year';
  months: number;
  /** Сумма в копейках: деньги в рублях с плавающей точкой не считают. */
  amount: number;
  title: string;
  description: string;
}

const DEFAULT_PRICE_RUB = 14900;

export function yearPlan(priceRub?: string | number): Plan {
  const rubles = Number(priceRub ?? DEFAULT_PRICE_RUB);
  const amount = Math.round((Number.isFinite(rubles) && rubles > 0 ? rubles : DEFAULT_PRICE_RUB) * 100);
  return {
    code: 'year',
    months: 12,
    amount,
    title: 'Подписка edway.space на год',
    description: 'Доступ к платформе для всей школы на 12 месяцев',
  };
}

/** «1490000» → «14 900 ₽» для писем, чеков и страниц оплаты. */
export function formatAmount(amount: number): string {
  return `${(amount / 100).toLocaleString('ru-RU')} ₽`;
}

/** ЮKassa принимает сумму строкой с двумя знаками после запятой. */
export function toYooAmount(amount: number): string {
  return (amount / 100).toFixed(2);
}
