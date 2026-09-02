'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  href?: string;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110 active:brightness-95 border border-transparent',
  secondary: 'bg-transparent text-ink border border-line-strong hover:border-accent hover:text-accent',
  subtle: 'bg-surface-2 text-ink border border-transparent hover:bg-surface-3',
  ghost: 'bg-transparent text-muted border border-transparent hover:text-ink hover:bg-surface-2',
  danger: 'bg-danger text-white border border-transparent hover:brightness-110 active:brightness-95',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

const ICON_SIZES: Record<Size, number> = { sm: 15, md: 17, lg: 19 };

export function Button({
  variant = 'primary',
  size = 'md',
  icon = '',
  iconRight = '',
  block = false,
  loading = false,
  disabled = false,
  type = 'button',
  title = '',
  href = '',
  className = '',
  onClick,
  children,
}: Props) {
  const classes = [
    'inline-flex items-center justify-center font-bold tracking-normal select-none',
    'transition-[filter,background-color,border-color,color] duration-150',
    'disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap',
    'ng-tile-press cursor-pointer',
    VARIANTS[variant],
    SIZES[size],
    block ? 'w-full' : '',
    className,
  ].join(' ');

  const inner = (
    <>
      {loading ? (
        <Icon name="refresh" size={ICON_SIZES[size]} className="animate-spin" />
      ) : icon ? (
        <Icon name={icon} size={ICON_SIZES[size]} />
      ) : null}
      {children ? <span>{children}</span> : null}
      {iconRight && !loading ? <Icon name={iconRight} size={ICON_SIZES[size]} /> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        title={title}
        className={`${classes}${disabled || loading ? ' pointer-events-none' : ''}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} title={title} className={classes} disabled={disabled || loading} onClick={onClick}>
      {inner}
    </button>
  );
}
