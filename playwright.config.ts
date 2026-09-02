import { defineConfig, devices } from '@playwright/test';

/**
 * Сценарии гоняются против уже поднятой платформы: по умолчанию это
 * локальная разработка (Next на 3001 проксирует /api на NestJS), но тот же
 * набор проходит и по адресу собранного стека — задайте E2E_BASE_URL.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
