'use client';

import { useId, useRef } from 'react';
import { Icon } from './Icon';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  type?: 'date' | 'datetime-local' | 'month';
  hint?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
}

export function DateInput({
  value = '',
  onChange,
  label = '',
  type = 'date',
  hint = '',
  disabled = false,
  min,
  max,
  className = '',
}: Props) {
  const uid = useId();
  const field = useRef<HTMLInputElement>(null);

  function openPicker() {
    try {
      field.current?.showPicker?.();
    } catch {
      /* Safari не умеет showPicker — там сработает нативный клик по полю */
    }
  }

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={uid} className="ng-label text-muted block mb-1.5">
          {label}
        </label>
      ) : null}
      <div className="relative group">
        <input
          id={uid}
          ref={field}
          type={type}
          disabled={disabled}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="ng-date w-full h-11 bg-surface-2 text-ink text-sm border border-line focus:border-accent outline-none pl-3 pr-10 transition-colors disabled:opacity-50 cursor-pointer"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Открыть календарь"
          className="absolute right-0 top-0 h-11 w-10 flex items-center justify-center text-muted group-focus-within:text-accent hover:text-accent transition-colors cursor-pointer"
          onClick={openPicker}
        >
          <Icon name="calendar" size={17} />
        </button>
      </div>
      {hint ? <p className="text-xs text-faint mt-1.5">{hint}</p> : null}
    </div>
  );
}
