import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function EmptyState({ icon = 'box', title, description = '', actions }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <span className="w-14 h-14 bg-surface-2 border border-line flex items-center justify-center text-faint mb-4">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description ? <p className="text-sm text-muted mt-1 max-w-md">{description}</p> : null}
      {actions ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
