'use client';

import { Icon } from './Icon';

interface Props {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked = false, onChange, label = '', disabled = false, className = '' }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`flex w-fit items-center gap-2.5 select-none text-left ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <span
        className={`w-5 h-5 border flex items-center justify-center transition-colors shrink-0 ${
          checked ? 'bg-accent border-accent text-on-accent' : 'bg-surface-2 border-line-strong'
        }`}
      >
        {checked ? <Icon name="check" size={14} stroke={3} /> : null}
      </span>
      {label ? <span className="text-sm text-ink">{label}</span> : null}
    </button>
  );
}
