interface Props {
  rows?: number;
  className?: string;
}

export function Skeleton({ rows = 3, className = '' }: Props) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-4 bg-surface-2 animate-pulse" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
