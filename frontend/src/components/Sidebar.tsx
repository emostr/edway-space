'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Icon } from '@/lib/ui';
import { useAuth } from '@/lib/auth';

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  links: NavLink[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'Работа',
    links: [
      { href: '/dashboard', label: 'Обзор', icon: 'dashboard' },
      { href: '/classes', label: 'Классы', icon: 'grid' },
    ],
  },
  {
    title: 'Тестирование',
    links: [
      { href: '/tests', label: 'Тесты', icon: 'clipboard' },
      { href: '/assignments', label: 'Назначения', icon: 'calendar' },
      { href: '/grades', label: 'Оценки', icon: 'award' },
    ],
  },
  {
    title: 'Прочее',
    links: [{ href: '/settings', label: 'Настройки', icon: 'settings' }],
  },
];

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: Props) {
  const pathname = usePathname();
  const { profile } = useAuth();

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-bg border-r border-line flex flex-col transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <Link href="/dashboard" className="h-16 flex items-center gap-2.5 px-5 border-b border-line shrink-0">
        <span className="w-8 h-8 bg-accent flex items-center justify-center shrink-0 text-on-accent">
          <Icon name="graduation" size={18} />
        </span>
        <div className="leading-tight">
          <div className="font-extrabold text-ink tracking-normal">
            edway<span className="text-accent">.space</span>
          </div>
          <div className="text-[10px] text-faint uppercase font-bold">Кабинет учителя</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="ng-label text-faint px-3 mb-1.5">{section.title}</div>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm border-l-2 transition-colors ${
                  isActive(link.href)
                    ? 'text-ink bg-surface-2 border-accent font-semibold'
                    : 'text-muted border-transparent hover:text-ink hover:bg-surface-2'
                }`}
              >
                <span className="shrink-0">
                  <Icon name={link.icon} size={18} />
                </span>
                <span className="flex-1">{link.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {profile ? (
        <div className="border-t border-line p-3 shrink-0">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 p-2 hover:bg-surface-2 transition-colors"
          >
            <Avatar name={profile.fullName} size={38} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm font-bold text-ink truncate">{profile.fullName}</div>
              <div className="text-[11px] text-accent font-semibold uppercase tracking-normal truncate">
                {profile.subject || 'Учитель'}
              </div>
            </div>
            <span className="text-faint">
              <Icon name="chevronRight" size={16} />
            </span>
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
