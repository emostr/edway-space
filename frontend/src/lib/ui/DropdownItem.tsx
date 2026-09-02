'use client';

import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export function DropdownItem({ icon = '', danger = false, disabled = false, onClick, children }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface-2'
      }`}
    >
      {icon ? (
        <span className={danger ? '' : 'text-muted'}>
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      {children}
    </button>
  );
}
