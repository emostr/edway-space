import { expect, test } from '@playwright/test';
import { dismissToasts, fillField, open, register } from './helpers';

/**
 * Каждая заготовка должна рисоваться: KaTeX не знает части команд из русской
 * традиции, и кнопка, вставляющая нерабочую формулу, хуже, чем её отсутствие.
 * Проверяем весь набор через предпросмотр — он рендерит тем же движком, что и
 * бланк с заданиями.
 */
test('все заготовки формул рисуются в предпросмотре', async ({ page }) => {
  test.slow();
  await register(page);
  await dismissToasts(page);

  await open(page, '/tests/new');
  await page.locator('.ProseMirror').first().click();
  await page.getByTitle('Формула (LaTeX)').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Формула')).toBeVisible();

  const buttons = dialog.locator('[data-latex]');
  const total = await buttons.count();
  expect(total, 'заготовок стало подозрительно мало').toBeGreaterThan(80);

  const latexes: string[] = [];
  for (let index = 0; index < total; index += 1) {
    latexes.push((await buttons.nth(index).getAttribute('data-latex')) ?? '');
  }

  const field = dialog.getByLabel('Формула');
  const preview = dialog.locator('.ng-label', { hasText: 'Предпросмотр' }).locator('..');

  const broken: string[] = [];
  for (const latex of latexes) {
    await field.fill(latex);
    if (await preview.locator('.katex-error').count()) {
      broken.push(latex);
    }
  }
  expect(broken, `не рисуются: ${broken.join(' | ')}`).toHaveLength(0);

  // Поиск сводит разделы в один список подходящих.
  await fillField(page, dialog.getByLabel('Заготовки'), 'вектор');
  await expect(dialog.locator('[data-latex]')).toHaveCount(2);

  // Заготовка вставляется по месту курсора, а не в конец строки.
  await fillField(page, dialog.getByLabel('Заготовки'), 'дробь');
  await field.fill('x = ');
  await dialog.locator('[data-latex]').first().click();
  await expect(field).toHaveValue('x = \\frac{a}{b}');

  await dialog.getByRole('button', { name: 'Вставить' }).click();
  // Формула встала в текст задания и отрисовалась.
  await expect(page.locator('.ProseMirror .katex').first()).toBeVisible();
});
