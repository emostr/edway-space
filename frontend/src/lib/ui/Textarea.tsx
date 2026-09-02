'use client';

import { useId, type Ref } from 'react';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  /** Нужен там, где важно положение курсора: вставка формулы по месту. */
  ref?: Ref<HTMLTextAreaElement>;
  autoFocus?: boolean;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  rows?: number;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

export function Textarea({
  value = '',
  onChange,
  ref,
  autoFocus = false,
  label = '',
  placeholder = '',
  hint = '',
  error = '',
  rows = 4,
  disabled = false,
  maxLength,
  className = '',
}: Props) {
  const uid = useId();
  const fieldClass = [
    'w-full bg-surface-2 text-ink text-sm border px-3 py-2.5 resize-y transition-colors',
    'placeholder:text-faint outline-none',
    error ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
    disabled ? 'opacity-50 pointer-events-none' : '',
  ].join(' ');

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={uid} className="ng-label text-muted block mb-1.5">
          {label}
        </label>
      ) : null}
      <textarea
        id={uid}
        ref={ref}
        autoFocus={autoFocus}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={fieldClass}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {error ? (
        <p className="text-xs text-danger mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}
