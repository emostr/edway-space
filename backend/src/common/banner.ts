export function buildBanner(port: number, env: string): string {
  const lines = [
    '',
    '  ┌──────────────────────────────────────────────┐',
    '  │  edway.space — школьное тестирование         │',
    '  └──────────────────────────────────────────────┘',
    `  API      http://127.0.0.1:${port}/api`,
    `  Режим    ${env}`,
    '',
  ];
  return lines.join('\n');
}
