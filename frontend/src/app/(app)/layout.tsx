'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { PoweredBy } from '@/components/PoweredBy';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, ready } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (ready && !profile) {
      router.replace('/login');
    }
  }, [ready, profile, router]);

  // Смена маршрута закрывает выдвижное меню на телефоне.
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

        <footer className="border-t border-line px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-faint">edway.space · школьное тестирование</p>
          <PoweredBy />
        </footer>
      </div>
    </div>
  );
}
