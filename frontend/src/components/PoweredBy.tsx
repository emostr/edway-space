// Без логотипов: набор коротких подписей в том же наборном стиле,
// что и заголовки разделов.
const STACK = ['TypeScript', 'Next.js', 'NestJS', 'Prisma', 'PostgreSQL', 'Tailwind', 'Docker', 'Caddy'];

export function PoweredBy() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-faint">
      <span className="uppercase font-bold">powered by</span>
      {STACK.map((item, index) => (
        <span key={item} className="contents">
          <span className="hover:text-accent transition-colors">{item}</span>
          {index < STACK.length - 1 ? <span className="text-line-strong">·</span> : null}
        </span>
      ))}
    </div>
  );
}
