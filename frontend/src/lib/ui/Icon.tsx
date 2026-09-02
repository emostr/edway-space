import { ICONS } from './icons';

interface Props {
  name: string;
  size?: number | string;
  stroke?: number | string;
  className?: string;
}

export function Icon({ name, size = 20, stroke = 2, className = '' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={stroke}
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }}
    />
  );
}
