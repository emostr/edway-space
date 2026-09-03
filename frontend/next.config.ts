import type { NextConfig } from 'next';

const config: NextConfig = {
  // В образ уезжает автономная сборка: рядом с ней нужен только node.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Сервис-воркер и манифест должны обновляться сразу: закешированный
        // воркер продолжал бы отдавать старую оболочку после обновления.
        source: '/:file(sw.js|manifest.json)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
  async rewrites() {
    // В разработке фронт стоит на 3001, а API — на 3000. В контейнере
    // проксирует Caddy, но переменная задана и там: лишним не будет.
    const api = process.env.API_ORIGIN ?? 'http://127.0.0.1:3000';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },
};

export default config;
