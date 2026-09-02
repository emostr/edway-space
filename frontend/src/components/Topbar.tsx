'use client';

import { useRouter } from 'next/navigation';
import { Avatar, Dropdown, DropdownItem, Icon } from '@/lib/ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/notify';

interface Props {
  onToggle?: () => void;
}

export function Topbar({ onToggle }: Props) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { profile, logout } = useAuth();

  async function doLogout() {
    const ok = await notify.confirm({
      title: 'Выйти из системы?',
      text: 'Придётся вводить логин и пароль заново.',
      confirmText: 'Выйти',
      danger: true,
    });
    if (!ok) {
      return;
    }
    await logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-bg/85 backdrop-blur border-b border-line flex items-center gap-3 px-4 sm:px-6">
      <button
        type="button"
        aria-label="Меню"
        className="lg:hidden h-9 w-9 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
        onClick={onToggle}
      >
        <Icon name="menu" size={22} />
      </button>

      <div className="flex-1" />

      <button
        type="button"
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        className="h-9 w-9 flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
        onClick={toggleTheme}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
      </button>

      <div className="w-px h-6 bg-line mx-1 hidden sm:block" />

      <Dropdown
        align="right"
        width={240}
        trigger={
          <span className="flex items-center gap-2 pl-1 pr-2 h-9 hover:bg-surface-2 transition-colors cursor-pointer">
            <Avatar name={profile?.fullName ?? ''} size={30} />
            <span className="text-faint hidden sm:block">
              <Icon name="chevronDown" size={15} />
            </span>
          </span>
        }
      >
        {(close) => (
          <>
            <div className="px-3.5 py-2.5 border-b border-line">
              <div className="text-sm font-bold text-ink truncate">{profile?.fullName}</div>
              <div className="text-xs text-muted">@{profile?.login}</div>
            </div>
            <DropdownItem
              icon="settings"
              onClick={() => {
                close();
                router.push('/settings');
              }}
            >
              Настройки
            </DropdownItem>
            <div className="my-1 border-t border-line" />
            <DropdownItem
              icon="logout"
              danger
              onClick={() => {
                close();
                void doLogout();
              }}
            >
              Выйти
            </DropdownItem>
          </>
        )}
      </Dropdown>
    </header>
  );
}
