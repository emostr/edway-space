import Link from 'next/link';
import { Icon } from '@/lib/ui';
import { PoweredBy } from '@/components/PoweredBy';
import { OPERATOR, SITE } from '@/lib/site';

export function Footer() {
  return (
    <footer className="border-t border-line px-4 sm:px-6 py-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 bg-accent flex items-center justify-center text-on-accent">
              <Icon name="graduation" size={18} />
            </span>
            <span className="font-extrabold text-ink">
              edway<span className="text-accent">.space</span>
            </span>
          </div>
          <p className="text-xs text-muted mt-3 max-w-xs">{SITE.tagline}.</p>
        </div>

        <div>
          <div className="ng-label text-faint mb-3">Платформа</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/#how" className="text-muted hover:text-accent transition-colors">
                Как это работает
              </Link>
            </li>
            <li>
              <Link href="/#price" className="text-muted hover:text-accent transition-colors">
                Цена
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-muted hover:text-accent transition-colors">
                Попробовать бесплатно
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-muted hover:text-accent transition-colors">
                Вход для учителей
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="ng-label text-faint mb-3">Документы</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/legal/terms" className="text-muted hover:text-accent transition-colors">
                Пользовательское соглашение
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="text-muted hover:text-accent transition-colors">
                Политика обработки персональных данных
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${SITE.email}`}
                className="text-muted hover:text-accent transition-colors"
              >
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-faint">
          {OPERATOR.name} · {OPERATOR.status} · ИНН {OPERATOR.inn}
        </p>
        <PoweredBy />
      </div>
    </footer>
  );
}
