'use client';

import { useId } from 'react';
import { Icon } from './Icon';

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface Props {
  value?: string | number;
  onChange?: (value: string) => void;
  label?: string;
  options?: Array<Option | string | number>;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  className?: string;
}

export function Select({
  value = '',
  onChange,
  label = '',
  options = [],
  placeholder = 'Выберите…',
  hint = '',
  disabled = false,
  allowEmpty = false,
  className = '',
}: Props) {
  const uid = useId();
  const normalized: Option[] = options.map((option) =>
    typeof option === 'object' ? option : { value: option, label: String(option) },
  );

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={uid} className="ng-label text-muted block mb-1.5">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={uid}
          disabled={disabled}
          value={String(value ?? '')}
          className="w-full h-11 bg-surface-2 text-ink text-sm border border-line focus:border-accent outline-none px-3 pr-9 appearance-none cursor-pointer transition-colors disabled:opacity-50"
          onChange={(event) => onChange?.(event.target.value)}
        >
          <option value="" disabled={!allowEmpty}>
            {placeholder}
          </option>
          {normalized.map((option) => (
            <option key={String(option.value)} value={String(option.value)} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <Icon name="chevronDown" size={16} />
        </span>
      </div>
      {hint ? <p className="text-xs text-faint mt-1.5">{hint}</p> : null}
    </div>
  );
}
