import { expect, test } from '@playwright/test';
import { open, register } from './helpers';

/**
 * Платформа ставится на телефон и планшет: манифест, иконки, свой значок в
 * системе и понятная страница вместо ошибки браузера, когда школьный сервер
 * недоступен.
 */
test.describe('Установка на устройство', () => {
  test('манифест, иконки и офлайн-страница отдаются', async ({ page }) => {
    await open(page, '/login');

    // Ссылка на манифест стоит в разметке — по ней браузер и предлагает установку.
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.json/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

    const manifest = await page.request.get('/manifest.json');
    expect(manifest.ok()).toBeTruthy();
    const data = await manifest.json();
    expect(data.name).toContain('edway.space');
    expect(data.display).toBe('standalone');
    expect(data.start_url).toBe('/dashboard');
    expect(data.shortcuts.length).toBeGreaterThan(0);

    // Иконки всех заявленных размеров должны существовать.
    for (const icon of data.icons) {
      const response = await page.request.get(icon.src);
      expect(response.ok(), `не отдаётся ${icon.src}`).toBeTruthy();
    }

    const offline = await page.request.get('/offline.html');
    expect(offline.ok()).toBeTruthy();
    expect(await offline.text()).toContain('Нет соединения');

    // Воркер и манифест не должны залипать в кеше браузера.
    const worker = await page.request.get('/sw.js');
    expect(worker.headers()['cache-control']).toContain('must-revalidate');
  });

  test('без сети показывается страница «нет соединения», а не ошибка браузера', async ({
    page,
    context,
  }) => {
    test.slow();
    await register(page);

    // Ждём, пока воркер действительно возьмёт страницы под контроль: пока
    // controller пуст, запросы идут мимо него и офлайн-страницы не будет.
    await page.waitForFunction(
      () => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
      undefined,
      { timeout: 20_000 },
    );

    await context.setOffline(true);
    try {
      await page.goto('/grades', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Нет соединения' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Попробовать снова' })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }

    // Со связью платформа возвращается к обычной работе.
    await open(page, '/grades');
    await expect(page.getByRole('heading', { name: 'Оценки' })).toBeVisible();
  });
});
