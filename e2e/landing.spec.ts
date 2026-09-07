import { expect, test } from '@playwright/test';
import { open } from './helpers';

/**
 * Витрина платформы: главная, документы и то, что от них требуют поисковики.
 * Лендинг — единственная страница, которую видят до регистрации, поэтому
 * ошибка здесь стоит дороже, чем в кабинете.
 */
test.describe('Лендинг', () => {
  test('главная рассказывает о платформе и ведёт к регистрации', async ({ page }) => {
    await open(page, '/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Контрольные на бумаге');
    await expect(page.getByText('14 900').first()).toBeVisible();

    // Разделы на месте: как работает, возможности, цена, вопросы.
    for (const anchor of ['#how', '#features', '#price', '#faq']) {
      await expect(page.locator(anchor)).toHaveCount(1);
    }

    await page.getByRole('link', { name: 'Попробовать бесплатно' }).first().click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Регистрация школы' })).toBeVisible();
  });

  test('поисковику отдаётся всё нужное: описание, разметка, карта сайта', async ({ page }) => {
    await open(page, '/');

    await expect(page).toHaveTitle(/edway\.space/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /бланк|тест|провер/i);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    // Структурированные данные: продукт с ценой и блок вопросов.
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    const parsed = JSON.parse(jsonLd);
    const types = parsed['@graph'].map((item: { '@type': string }) => item['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
    expect(jsonLd).toContain('14900');

    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain('/legal/privacy');

    const robots = await page.request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    // Кабинет и панель платформы поисковику не нужны.
    expect(robotsText).toContain('Disallow: /dashboard');
    expect(robotsText).toContain('Sitemap:');
  });

  test('документы открыты без входа и содержат реквизиты оператора', async ({ page }) => {
    await open(page, '/legal/terms');
    await expect(page.getByRole('heading', { name: 'Пользовательское соглашение' })).toBeVisible();
    await expect(page.getByText('583522061051').first()).toBeVisible();
    await expect(page.getByText(/14 900/).first()).toBeVisible();

    await open(page, '/legal/privacy');
    await expect(
      page.getByRole('heading', { name: 'Политика обработки персональных данных' }),
    ).toBeVisible();
    // Ключевые вещи по 152-ФЗ: основания, сроки, права, локализация.
    for (const text of [
      '152-ФЗ',
      'по поручению',
      'территории Российской Федерации',
      'Роскомнадзор',
      'ЮKassa',
    ]) {
      await expect(page.getByText(new RegExp(text, 'i')).first()).toBeVisible();
    }
  });

  test('в подвале лендинга есть ссылки на документы', async ({ page }) => {
    await open(page, '/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Пользовательское соглашение' })).toBeVisible();
    await expect(
      footer.getByRole('link', { name: 'Политика обработки персональных данных' }),
    ).toBeVisible();
    await expect(footer.getByText('583522061051')).toBeVisible();
  });
});
