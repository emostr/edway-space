'use client';

interface Props {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export function Toggle({ checked = false, onChange, label = '', hint = '', disabled = false }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`flex w-full items-start gap-3 select-none text-left ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        className={`relative inline-flex items-center w-12 h-6 px-1 border transition-colors duration-150 shrink-0 mt-0.5 ${
          checked ? 'bg-accent border-accent' : 'bg-surface-2 border-line-strong'
        }`}
      >
        <span
          className={`w-4 h-4 transition-transform duration-200 ease-out ${
            checked ? 'translate-x-6 bg-on-accent' : 'translate-x-0 bg-muted'
          }`}
        />
      </span>
      <span className="min-w-0">
        {label ? <span className="block text-sm text-ink">{label}</span> : null}
        {hint ? <span className="block text-xs text-faint mt-0.5">{hint}</span> : null}
      </span>
    </button>
  );
}
