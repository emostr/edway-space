type Variant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const COLORS: Record<Variant, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
};

interface Props {
  value?: number;
  max?: number;
  variant?: string;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function Progress({
  value = 0,
  max = 100,
  variant = 'accent',
  label = '',
  showValue = false,
  className = '',
}: Props) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const color = COLORS[(variant in COLORS ? variant : 'accent') as Variant];

  return (
    <div className={className}>
      {label || showValue ? (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {label ? <span className="text-xs font-semibold text-muted truncate">{label}</span> : null}
          {showValue ? (
            <span className="text-xs font-bold text-ink tabular-nums">{Math.round(pct)}%</span>
          ) : null}
        </div>
      ) : null}
      <div className="h-2 w-full bg-surface-3 overflow-hidden">
        <div className={`h-full transition-[width] duration-500 ease-out ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
