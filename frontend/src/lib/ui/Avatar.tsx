interface Props {
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name = '', size = 40, className = '' }: Props) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden bg-accent text-on-accent font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </span>
  );
}
