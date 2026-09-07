import type { ReactNode } from 'react';

interface Props {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

/** Раздел лендинга: тот же ритм заголовков, что и в кабинете. */
export function Section({ id, eyebrow, title, subtitle, children, className = '' }: Props) {
  return (
    <section id={id} className={`px-4 sm:px-6 py-16 sm:py-24 ${className}`}>
      <div className="max-w-5xl mx-auto">
        {eyebrow ? <div className="ng-label text-accent mb-3">{eyebrow}</div> : null}
        <h2 className="text-2xl sm:text-4xl font-extrabold text-ink tracking-normal max-w-3xl">{title}</h2>
        {subtitle ? <p className="text-muted mt-3 max-w-2xl">{subtitle}</p> : null}
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </section>
  );
}
