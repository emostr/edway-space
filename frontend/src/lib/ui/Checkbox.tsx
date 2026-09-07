'use client';

import { Icon } from './Icon';

interface Props {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  /** Нужен, когда подпись стоит рядом отдельным текстом, а не внутри. */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked = false,
  onChange,
  label = '',
  ariaLabel,
  disabled = false,
  className = '',
}: Props) {
  return (
    <button
      type="button"
      // Это флажок, а не кнопка: без роли его не найдут ни программы чтения
      // с экрана, ни автотесты.
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel || label || undefined}
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
