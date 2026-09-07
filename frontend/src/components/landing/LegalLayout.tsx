import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { DOCS_DATE } from '@/lib/site';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Общее оформление документов. Текст читают редко и по делу, поэтому здесь
 * узкая колонка, крупный шрифт и заметная дата редакции.
 */
export function LegalLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="px-4 sm:px-6 py-12 sm:py-16">
        <article className="max-w-3xl mx-auto">
          <div className="w-10 h-1 bg-accent mb-4" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-normal">{title}</h1>
          {subtitle ? <p className="text-muted mt-3">{subtitle}</p> : null}
          <p className="text-xs text-faint mt-4">Редакция от {DOCS_DATE}</p>

          <div className="ng-legal mt-10 space-y-8">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

interface ClauseProps {
  number: string;
  title: string;
  children: ReactNode;
}

export function Clause({ number, title, children }: ClauseProps) {
  return (
    <section>
      <h2 className="text-lg font-bold text-ink flex gap-2.5">
        <span className="text-accent">{number}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm text-muted leading-relaxed">{children}</div>
    </section>
  );
}
