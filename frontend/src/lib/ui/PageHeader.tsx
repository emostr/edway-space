import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle = '', actions }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <div className="w-10 h-1 bg-accent mb-3" />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-normal">{title}</h1>
        {subtitle ? <p className="text-muted mt-1 text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
