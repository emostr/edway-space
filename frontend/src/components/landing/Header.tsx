'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Icon } from '@/lib/ui';

const LINKS = [
  { href: '/#how', label: 'Как это работает' },
  { href: '/#features', label: 'Возможности' },
  { href: '/#price', label: 'Цена' },
  { href: '/#faq', label: 'Вопросы' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-line">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 bg-accent flex items-center justify-center text-on-accent">
            <Icon name="graduation" size={18} />
          </span>
          <span className="font-extrabold text-ink">
            edway<span className="text-accent">.space</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 flex-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 md:hidden" />

        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" href="/login">
            Войти
          </Button>
          <Button href="/register" iconRight="arrowRight">
            Попробовать
          </Button>
        </div>

        <button
          type="button"
          aria-label="Меню"
          className="sm:hidden h-9 w-9 flex items-center justify-center text-muted"
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      {open ? (
        <div className="sm:hidden border-t border-line px-4 py-4 space-y-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-muted hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" href="/login" block>
              Войти
            </Button>
            <Button href="/register" block>
              Попробовать
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
