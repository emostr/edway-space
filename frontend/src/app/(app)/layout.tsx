'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Icon } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { setApiHandlers } from '@/lib/api';
import { WORK_ROUTES, homeFor } from '@/lib/routes';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { PoweredBy } from '@/components/PoweredBy';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, ready, reload } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Сервер отвечает 423, пока учётная запись не прошла настройку, и 402, когда
  // подписка школы закончилась. Оба ответа означают переход на другую
  // страницу, а не ошибку, — обрабатываем их в одном месте.
  useEffect(() => {
    setApiHandlers({
      onSetupRequired: () => router.replace('/setup'),
      onSubscriptionExpired: () => router.replace('/subscription'),
    });
    return () => setApiHandlers({});
  }, [router]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (profile.setupStep !== 'done') {
      router.replace('/setup');
      return;
    }
    // Платформенному администратору в кабинете школы делать нечего, и наоборот.
    const inPlatform = pathname.startsWith('/admin');
    if (profile.role === 'PLATFORM_ADMIN' && !inPlatform && pathname !== '/settings') {
      router.replace('/admin');
      return;
    }
    if (profile.role !== 'PLATFORM_ADMIN' && inPlatform) {
      router.replace('/dashboard');
      return;
    }
    // Школа без подписки: рабочие разделы закрыты, страница продления открыта.
    const expired = profile.school && profile.school.status !== 'TRIAL' && profile.school.status !== 'ACTIVE';
    if (expired && WORK_ROUTES.some((route) => pathname.startsWith(route))) {
      router.replace('/subscription');
    }
  }, [ready, profile, pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!ready || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-10 h-1 bg-accent animate-pulse" />
      </div>
    );
  }

  const school = profile.school;
  // О конце пробного периода предупреждаем заранее и ненавязчиво: полоской
  // над содержимым, а не окном поверх работы.
  const warn = school && (school.status === 'TRIAL' || school.daysLeft <= 14);

  return (
    <div className="min-h-screen flex bg-bg">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onToggle={() => setSidebarOpen((value) => !value)} />

        {warn && school ? (
          <div className="border-b border-line bg-surface-2 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3">
            <Icon
              name={school.status === 'TRIAL' ? 'info' : 'alert'}
              size={16}
              className={school.status === 'TRIAL' ? 'text-info' : 'text-warning'}
            />
            <span className="text-xs text-ink flex-1 min-w-[200px]">
              {school.status === 'TRIAL'
                ? `Пробный период: осталось ${school.daysLeft} дн. Данные сохранятся и после него.`
                : `Подписка заканчивается через ${school.daysLeft} дн.`}
            </span>
            {profile.role === 'SCHOOL_ADMIN' ? (
              <Link href="/subscription" className="text-xs text-accent hover:underline">
                Продлить
              </Link>
            ) : null}
          </div>
        ) : null}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

        <footer className="border-t border-line px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-faint">edway.space · школьное тестирование</p>
          <PoweredBy />
        </footer>
      </div>
    </div>
  );
}
