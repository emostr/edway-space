import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Variant = 'info' | 'success' | 'warning' | 'danger';

const MAP: Record<Variant, { border: string; icon: string; tint: string }> = {
  info: { border: 'border-l-info', icon: 'info', tint: 'text-info' },
  success: { border: 'border-l-success', icon: 'checkCircle', tint: 'text-success' },
  warning: { border: 'border-l-warning', icon: 'alert', tint: 'text-warning' },
  danger: { border: 'border-l-danger', icon: 'alert', tint: 'text-danger' },
};

interface Props {
  variant?: Variant;
  title?: string;
  className?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function Alert({ variant = 'info', title = '', className = '', children, actions }: Props) {
  const conf = MAP[variant];
  return (
    <div
      className={`flex items-start gap-3 bg-surface border border-line border-l-[3px] px-4 py-3 ${conf.border} ${className}`}
    >
      <span className={`shrink-0 mt-0.5 ${conf.tint}`}>
        <Icon name={conf.icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold text-ink text-sm">{title}</p> : null}
        <div className={`text-sm text-muted ${title ? 'mt-0.5' : ''}`}>{children}</div>
      </div>
      {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
