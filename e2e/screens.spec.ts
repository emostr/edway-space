import { test } from '@playwright/test';
import {
  PASSWORD,
  dismissToasts,
  fillField,
  fillOption,
  freeClass,
  open,
  register,
  registerSchool,
  submitTotp,
} from './helpers';

/**
 * Обход интерфейса со снимками экрана: быстрый способ увидеть, что все
 * разделы отрисовываются и в тёмной теме, и в светлой. Снимки складываются
 * в screenshots/ и в репозиторий не попадают.
 */
test('обход разделов со снимками', async ({ page }) => {
  test.slow();
  const shot = (name: string) => page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });

  await open(page, '/');
  await shot('00-landing');

  await open(page, '/login');
  await shot('01-login');

  // Первичная настройка: пароль и второй фактор с кодом для камеры.
  const created = await registerSchool(page);
  await open(page, '/login');
  await fillField(page, page.getByLabel('Логин'), created.login);
  await fillField(page, page.getByLabel('Пароль'), created.temporary);
  await page.getByRole('button', { name: 'Войти' }).click();
  await fillField(page, page.getByLabel('Временный пароль'), created.temporary);
  await fillField(page, page.getByLabel(/^Новый пароль$/), PASSWORD);
  await fillField(page, page.getByLabel('Новый пароль ещё раз'), PASSWORD);
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  await page.locator('svg[shape-rendering="crispEdges"]').first().waitFor();
  await shot('01b-totp');

  const secret = (await page.locator('.font-mono.text-lg').innerText()).trim();
  await submitTotp(page, secret, 'Код из приложения');
  await page.getByRole('button', { name: /Записал/ }).click();
  await dismissToasts(page);
  await shot('02-dashboard');

  // Класс со списком учеников.
  await open(page, '/classes');
  const target = await freeClass(page);
  await page.getByRole('button', { name: 'Создать класс' }).first().click();
  await page.getByLabel('Номер').selectOption(String(target.number));
  await page.getByLabel('Буква').selectOption(target.letter);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await dismissToasts(page);
  await page.getByRole('button', { name: `Класс ${target.name}` }).click();
  await fillField(page, page.getByRole('textbox'), 'Абрамов Илья\nБелова Анна\nВолков Пётр');
  await shot('03-classes-students');
  await page.getByRole('button', { name: 'Сохранить список' }).click();
  await dismissToasts(page);

  // Конструктор: задание с формулой.
  await open(page, '/tests/new');
  await fillField(page, page.getByLabel(/^Название/), 'Показательный тест');
  await page.locator('.ProseMirror').first().click();
  await page.keyboard.type('Найдите значение выражения ');
  await page.getByTitle('Формула (LaTeX)').first().click();
  await fillField(page, page.getByLabel('Формула'), '\\frac{3}{4} + \\sqrt{16}');
  await page.waitForTimeout(200);
  await shot('04-formula-editor');
  await page.getByRole('button', { name: 'Вставить' }).click();
  await fillOption(page, 0, '4,75');
  await fillOption(page, 1, '5,25');
  await page.getByTitle('Отметить верным').first().click();
  await shot('05-test-builder');

  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await dismissToasts(page);
  await shot('06-test-view');

  // Назначение и бланки.
  await page.getByRole('link', { name: 'Назначить классу' }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Класс').selectOption({ label: `${target.name} · 3 чел.` });
  await fillField(page, form.getByLabel('Дата работы'), '2026-09-25');
  await form.getByRole('button', { name: 'Назначить' }).click();
  await dismissToasts(page);
  await shot('07-assignment');

  await page.getByRole('link', { name: 'Печать бланков' }).click();
  await page.locator('.sheet-page').first().waitFor();
  await shot('08-print-sheets');

  // Светлая тема на журнале оценок.
  await open(page, '/settings');
  // В шапке есть переключатель с подписью «Светлая тема» — берём кнопку из настроек.
  await page.getByRole('button', { name: 'Светлая', exact: true }).click();
  // Цвета переходят анимацией: снимок сразу после клика поймал бы полпути.
  await page.waitForTimeout(400);
  await shot('09-settings-light');
  await open(page, '/grades');
  await shot('10-grades-light');
});
