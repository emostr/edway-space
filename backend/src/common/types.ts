import { AccountRole, SchoolStatus } from '../generated/prisma/enums';

export interface SessionPayload {
  /** id строки AuthSession — по нему сессию можно отозвать */
  sid: string;
  sub: string;
}

export interface RequestSchool {
  id: string;
  name: string;
  slug: string;
  status: SchoolStatus;
  paidUntil: Date;
  /** Сколько дней осталось до конца оплаченного периода (может быть отрицательным). */
  daysLeft: number;
}

export interface RequestAccount {
  id: string;
  login: string;
  fullName: string;
  role: AccountRole;
  sessionId: string;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  /** У администратора платформы школы нет: он обслуживает все сразу. */
  school: RequestSchool | null;
}

export const SESSION_COOKIE = 'edway_session';

/** Сколько дней школа знакомится с платформой до первой оплаты. */
export const TRIAL_DAYS = 14;

/** Что осталось сделать учётной записи до полноценной работы. */
export type SetupStep = 'password' | 'totp' | 'done';
