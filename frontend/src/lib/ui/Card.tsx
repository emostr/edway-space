import type { ReactNode } from 'react';

interface Props {
  title?: string;
  subtitle?: string;
  accent?: boolean;
  padding?: boolean;
  className?: string;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Card({
  title = '',
  subtitle = '',
  accent = false,
  padding = true,
  className = '',
  header,
  actions,
  footer,
  children,
}: Props) {
  return (
    <section
      className={`bg-surface border border-line ${accent ? 'border-l-[3px] border-l-accent' : ''} ${className}`}
    >
      {title || subtitle || header || actions ? (
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
          <div className="min-w-0">
            {header ?? (
              <>
                <h3 className="text-[15px] font-bold text-ink truncate">{title}</h3>
                {subtitle ? <p className="text-xs text-muted mt-0.5">{subtitle}</p> : null}
              </>
            )}
          </div>
          {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={padding ? 'p-5' : ''}>{children}</div>
      {footer ? (
        <footer className="px-5 py-3 border-t border-line bg-surface-2/40">{footer}</footer>
      ) : null}
    </section>
  );
}
