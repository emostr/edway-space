import type { ReactNode } from 'react';

type Variant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const VARIANTS: Record<Variant, string> = {
  neutral: 'bg-surface-3 text-muted',
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
};

const DOTS: Record<Variant, string> = {
  neutral: 'bg-muted',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

interface Props {
  variant?: string;
  dot?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Badge({ variant = 'neutral', dot = false, className = '', children }: Props) {
  const key = (variant in VARIANTS ? variant : 'neutral') as Variant;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-normal ${VARIANTS[key]} ${className}`}
    >
      {dot ? <span className={`w-1.5 h-1.5 ${DOTS[key]}`} /> : null}
      {children}
    </span>
  );
}
