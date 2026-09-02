'use client';

import { useId } from 'react';
import { Icon } from './Icon';

interface Props {
  value?: string | number;
  onChange?: (value: string) => void;
  label?: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  icon?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url';
  autoComplete?: string;
  className?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function Input({
  value = '',
  onChange,
  label = '',
  type = 'text',
  placeholder = '',
  hint = '',
  error = '',
  icon = '',
  disabled = false,
  required = false,
  autoFocus = false,
  maxLength,
  min,
  max,
  inputMode,
  autoComplete,
  className = '',
  onKeyDown,
}: Props) {
  const uid = useId();

  const fieldClass = [
    'w-full h-11 bg-surface-2 text-ink text-sm border transition-colors',
    'placeholder:text-faint outline-none',
    icon ? 'pl-10 pr-3' : 'px-3',
    error ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
    disabled ? 'opacity-50 pointer-events-none' : '',
  ].join(' ');

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={uid} className="ng-label text-muted block mb-1.5">
          {label}
          {required ? <span className="text-accent"> *</span> : null}
        </label>
      ) : null}
      <div className="relative">
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none">
            <Icon name={icon} size={17} />
          </span>
        ) : null}
        <input
          id={uid}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          min={min}
          max={max}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value ?? ''}
          className={fieldClass}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      {error ? (
        <p className="text-xs text-danger mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}
