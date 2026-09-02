import Link from 'next/link';
import { Icon } from './Icon';

interface Props {
  label?: string;
  value?: string | number;
  icon?: string;
  hint?: string;
  solid?: boolean;
  href?: string;
  onClick?: () => void;
}

export function Tile({ label = '', value = '', icon = '', hint = '', solid = false, href = '', onClick }: Props) {
  const classes = [
    'relative overflow-hidden ng-tile-press border p-5 flex flex-col justify-between min-h-[128px] text-left w-full',
    solid ? 'bg-accent text-on-accent border-transparent' : 'bg-surface border-line hover:border-line-strong',
    href || onClick ? 'cursor-pointer' : '',
  ].join(' ');

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`ng-label ${solid ? 'text-on-accent/80' : 'text-muted'}`}>{label}</span>
        {icon ? <Icon name={icon} size={22} className={solid ? 'text-on-accent/70' : 'text-accent'} /> : null}
      </div>
      <div>
        <div className="text-3xl font-extrabold tracking-normal leading-none">{value}</div>
        {hint ? <div className={`mt-2 text-xs ${solid ? 'text-on-accent/70' : 'text-faint'}`}>{hint}</div> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}
