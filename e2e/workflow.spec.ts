import { expect, test } from '@playwright/test';
import { dismissToasts, fillField, freeClass, open, register, stamp } from './helpers';

/**
 * Сквозной путь учителя: класс → тест → назначение → бланки → проверка →
 * журнал оценок. Ответы вводятся руками — так же, как учитель правит то,
 * что не разобрал OCR.
 */
test('путь от класса до оценки в журнале', async ({ page }) => {
  test.slow();
  await register(page);
  await dismissToasts(page);

  const suffix = stamp();
  const title = `Контрольная ${suffix}`;

  // ─── Класс со списком учеников ───────────────────────────────────────────
  await open(page, '/classes');
  const target = await freeClass(page);

  await page.getByRole('button', { name: 'Создать класс' }).first().click();
  await page.getByLabel('Номер').selectOption(String(target.number));
  await page.getByLabel('Буква').selectOption(target.letter);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await dismissToasts(page);

  await page.getByRole('button', { name: `Класс ${target.name}` }).click();
  await fillField(page, page.getByRole('textbox'), 'Абрамов Илья\nБелова Анна\nВолков Пётр');
  await page.getByRole('button', { name: 'Сохранить список' }).click();
  await dismissToasts(page);
  await expect(page.getByRole('button', { name: `Класс ${target.name}` })).toBeVisible();
  await expect(page.getByText('3 ученика').first()).toBeVisible();

  // ─── Тест из трёх заданий разных типов ───────────────────────────────────
  await open(page, '/tests/new');
  await fillField(page, page.getByLabel(/^Название/), title);
  await fillField(page, page.getByLabel('Описание'), 'Сквозная проверка платформы');

  // Первое задание — с одним верным вариантом.
  await page.locator('.ProseMirror').first().click();
  await page.keyboard.type('Сколько будет два плюс два?');
  const options = page.getByPlaceholder(/^Вариант /);
  await fillField(page, options.nth(0), '4');
  await fillField(page, options.nth(1), '5');
  await page.getByTitle('Отметить верным').first().click();

  // Второе — краткий ответ, его платформа сверяет с эталоном.
  await page.getByRole('button', { name: 'Краткий ответ' }).click();
  await page.locator('.ProseMirror').last().click();
  await page.keyboard.type('Столица России?');
  await fillField(page, page.getByPlaceholder('Например: 3/4'), 'Москва');

  // Третье — развёрнутое, его платформа не проверяет.
  await page.getByRole('button', { name: 'Развёрнутый ответ' }).click();
  await page.locator('.ProseMirror').last().click();
  await page.keyboard.type('Объясните своими словами');

  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page).toHaveURL(/\/tests\/[a-z0-9]+$/);
  // Именно метка на карточке теста: рядом всплывает уведомление с похожим текстом.
  await expect(page.getByText('Опубликован', { exact: true })).toBeVisible();
  await dismissToasts(page);

  // ─── Назначение классу на дату ───────────────────────────────────────────
  await page.getByRole('link', { name: 'Назначить классу' }).click();
  // На странице два поля «Класс» — фильтр списка и поле формы: берём форму.
  const form = page.getByRole('dialog');
  await expect(form.getByRole('heading', { name: 'Назначить тест' })).toBeVisible();
  await form.getByLabel('Класс').selectOption({ label: `${target.name} · 3 чел.` });
  await fillField(page, form.getByLabel('Дата работы'), '2026-09-15');
  await form.getByRole('button', { name: 'Назначить' }).click();

  await expect(page).toHaveURL(/\/assignments\/[a-z0-9]+$/);
  await dismissToasts(page);
  // Три ученика и два запасных бланка.
  await expect(page.getByRole('link', { name: 'Абрамов Илья' })).toBeVisible();
  await expect(page.getByText('Запасной бланк').first()).toBeVisible();

  // ─── Бланки для печати ───────────────────────────────────────────────────
  const assignmentUrl = page.url();
  await page.getByRole('link', { name: 'Печать бланков' }).click();
  await expect(page).toHaveURL(/\/print\//);
  await expect(page.locator('.sheet-page').first()).toBeVisible();
  // Лист заданий плюс по бланку на каждую из пяти работ.
  await expect(page.locator('.sheet-page')).toHaveCount(6);
  // Угловые метки — по четыре на бланк, по ним выравнивается скан.
  await expect(page.locator('.sheet-page').nth(1).locator('.sheet-marker')).toHaveCount(4);

  // ─── Проверка работы вручную ─────────────────────────────────────────────
  await page.goto(assignmentUrl);
  await page.getByRole('link', { name: 'Абрамов Илья' }).click();
  await expect(page).toHaveURL(/\/works\//);

  const answers = page.getByLabel('Ответ ученика');
  await answers.nth(0).fill('А');
  await answers.nth(0).blur();
  await expect(page.getByText('1 / 1').first()).toBeVisible();

  await answers.nth(1).fill('москва');
  await answers.nth(1).blur();
  // Регистр и «ё» платформа приводит сама — ответ засчитан.
  await expect(page.getByText('2 из 7 баллов', { exact: false })).toBeVisible();

  await page.getByLabel('Баллы').fill('5');
  await page.getByLabel('Баллы').blur();
  await page.getByRole('button', { name: 'Завершить и выставить оценку' }).click();
  await expect(page.getByText('Оценка выставлена')).toBeVisible();
  await dismissToasts(page);
  await expect(page.getByText('оценка 5')).toBeVisible();

  // ─── Разбор заданий по классу ────────────────────────────────────────────
  await page.goto(assignmentUrl);
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true');
  await expect(page.getByText('Разбор заданий')).toBeVisible();
  await expect(page.getByText('По 1 проверенным работам', { exact: false })).toBeVisible();

  // ─── Журнал ──────────────────────────────────────────────────────────────
  await open(page, '/grades');
  // В журнале лежат работы всех прогонов — ищем строку именно этой контрольной.
  const journalRow = page.locator('tr', { hasText: title });
  await expect(journalRow).toHaveCount(1);
  await expect(journalRow.getByRole('link', { name: 'Абрамов Илья' })).toBeVisible();
  await expect(journalRow).toContainText('5');
});
