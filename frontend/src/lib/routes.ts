import type { Profile } from './types';

/**
 * Куда вести вошедшего. Развилок три: незаконченная настройка, панель
 * платформы у её владельца и обычный кабинет школы. Отдельно — школа с
 * законченной подпиской: ей открыта только страница продления.
 */
export function homeFor(profile: Profile): string {
  if (profile.setupStep !== 'done') {
    return '/setup';
  }
  if (profile.role === 'PLATFORM_ADMIN') {
    return '/admin';
  }
  if (profile.school && (profile.school.status === 'EXPIRED' || profile.school.status === 'BLOCKED')) {
    return '/subscription';
  }
  return '/dashboard';
}

/** Разделы кабинета, закрытые для школы с законченной подпиской. */
export const WORK_ROUTES = ['/dashboard', '/classes', '/tests', '/assignments', '/grades', '/works'];
