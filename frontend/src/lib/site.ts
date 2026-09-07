/**
 * Сведения о платформе и её операторе. Всё, что попадает в документы,
 * счета и подписи, лежит здесь: реквизиты меняются одним файлом и
 * переменными окружения, а не поиском по разметке.
 */
export const SITE = {
  name: 'edway.space',
  title: 'edway.space — школьная платформа тестирования',
  tagline: 'Контрольные на бумаге, проверка — за минуты',
  description:
    'Конструктор тестов для учителя: соберите работу с формулами и картинками, ' +
    'распечатайте бланки, отсканируйте написанное — закрытые задания платформа проверит сама ' +
    'и выставит оценки по вашей шкале.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edway.space',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@edway.space',
} as const;

/** Оператор персональных данных — по 152-ФЗ его реквизиты обязательны. */
export const OPERATOR = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? 'Павлов Матвей Ильич',
  status: process.env.NEXT_PUBLIC_OPERATOR_STATUS ?? 'самозанятый (налог на профессиональный доход)',
  inn: process.env.NEXT_PUBLIC_OPERATOR_INN ?? '583522061051',
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? 'Российская Федерация',
  email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL ?? 'hello@edway.space',
} as const;

/** Дата, с которой действует текущая редакция документов. */
export const DOCS_DATE = process.env.NEXT_PUBLIC_DOCS_DATE ?? '3 сентября 2026 года';
