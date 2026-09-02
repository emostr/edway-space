interface Props {
  points?: number[];
  width?: number;
  height?: number;
  area?: boolean;
  className?: string;
}

export function Sparkline({ points = [], width = 120, height = 36, area = true, className = '' }: Props) {
  let line = '';
  let fill = '';

  if (points.length >= 2) {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    const step = width / (points.length - 1);
    const coords = points.map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return [x, y] as const;
    });
    line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    fill = `${line} L${width},${height} L0,${height} Z`;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={`overflow-visible ${className}`}
    >
      {area && fill ? <path d={fill} fill="var(--ng-accent)" opacity="0.14" /> : null}
      {line ? (
        <path d={line} fill="none" stroke="var(--ng-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}
