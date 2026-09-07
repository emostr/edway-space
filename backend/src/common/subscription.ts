import { AccountRole, SchoolStatus } from '../generated/prisma/enums';
import { SetupStep } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Сколько дней осталось до даты. Прошедший срок даёт отрицательное число. */
export function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

/**
 * Статус школы с поправкой на календарь: в базе может стоять ACTIVE, но если
 * оплаченный срок вышел, школа уже EXPIRED. Отдельного планировщика для этого
 * заводить незачем — дата и есть источник истины.
 */
export function effectiveStatus(school: { status: SchoolStatus; paidUntil: Date }): SchoolStatus {
  if (school.status === 'BLOCKED') {
    return 'BLOCKED';
  }
  if (school.paidUntil.getTime() < Date.now()) {
    return 'EXPIRED';
  }
  return school.status;
}

/** Школа с таким статусом пускает сотрудников к работе. */
export function isUsable(status: SchoolStatus): boolean {
  return status === 'TRIAL' || status === 'ACTIVE';
}

/**
 * Что осталось сделать учётной записи. Второй фактор обязателен всем, кто
 * распоряжается чужими данными: администратору платформы и директору школы.
 */
export function setupStep(account: {
  role: AccountRole;
  mustChangePassword: boolean;
  totpEnabled: boolean;
}): SetupStep {
  if (account.mustChangePassword) {
    return 'password';
  }
  if (!account.totpEnabled && account.role !== 'TEACHER') {
    return 'totp';
  }
  return 'done';
}
