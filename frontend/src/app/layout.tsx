import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import 'sweetalert2-neutral/dist/sweetalert2.min.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'edway.space',
  description: 'Платформа школьного тестирования: конструктор тестов, печать бланков и проверка работ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" data-accent="teal">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
