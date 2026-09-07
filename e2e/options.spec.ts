import { expect, test } from '@playwright/test';
import { dismissToasts, fillField, fillOption, freeClass, open, register, stamp } from './helpers';

/**
 * Вариант ответа — такой же текст задания, только короткий: в нём нужны и
 * начертание, и формула. «Выберите верное: x², x³» без этого не записать.
 */
test('вариант ответа держит начертание и формулу', async ({ page }) => {
  test.slow();
  await register(page);
  await dismissToasts(page);

  const title = `Формулы в вариантах ${stamp()}`;

  await open(page, '/tests/new');
  await fillField(page, page.getByLabel(/^Название/), title);

  await page.locator('.ProseMirror').first().click();
  await page.keyboard.type('Какое выражение задаёт параболу?');

  // Первый вариант — с формулой из редактора.
  const first = page.locator('[data-option="0"] .ProseMirror');
  await first.click();
  await page.locator('[data-option="0"]').getByTitle('Формула (LaTeX)').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Формула').fill('y = x^2');
  await dialog.getByRole('button', { name: 'Вставить' }).click();
  await expect(first.locator('.katex')).toBeVisible();

  // Второй — полужирным.
  const second = page.locator('[data-option="1"] .ProseMirror');
  await second.click();
  await page.locator('[data-option="1"]').getByTitle('Полужирный').click();
  await page.keyboard.type('прямая');
  await expect(second.locator('strong')).toHaveText('прямая');

  await page.getByTitle('Отметить верным').first().click();
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page).toHaveURL(/\/tests\/(?!new$)[a-z0-9]+$/);
  await dismissToasts(page);

  // Карточка теста показывает вариант так же, как конструктор.
  await expect(page.locator('.katex').first()).toBeVisible();
  await expect(page.getByText('прямая')).toBeVisible();

  // И на листе с заданиями, который уходит ученикам.
  const testId = /\/tests\/([a-z0-9]+)/.exec(page.url())?.[1];

  await open(page, '/classes');
  const target = await freeClass(page);
  await page.getByRole('button', { name: 'Создать класс' }).first().click();
  await page.getByLabel('Номер').selectOption(String(target.number));
  await page.getByLabel('Буква').selectOption(target.letter);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await dismissToasts(page);
  await page.getByRole('button', { name: `Класс ${target.name}` }).click();
  await fillField(page, page.getByRole('textbox'), 'Пробный Пётр');
  await page.getByRole('button', { name: 'Сохранить список' }).click();
  await dismissToasts(page);

  const classes = await (await page.request.get('/api/classes')).json();
  const classId = classes.find((item: { name: string }) => item.name === target.name).id;
  const assignment = await page.request.post('/api/assignments', {
    data: { testId, classId, date: '2026-09-22', spare: 0 },
  });
  expect(assignment.ok(), await assignment.text()).toBeTruthy();

  await open(page, `/print/${(await assignment.json()).id}`);
  await page.getByRole('combobox').selectOption('questions');
  const sheet = page.locator('.sheet-page').first();
  await expect(sheet.locator('.katex').first()).toBeVisible();
  await expect(sheet.locator('strong', { hasText: 'прямая' })).toBeVisible();
});

/**
 * Разметку присылает браузер, а значит её мог прислать кто угодно. Тест
 * уходит коллегам по школе — чужой скрипт в варианте ответа исполнялся бы
 * на их страницах.
 */
test('чужая разметка в варианте ответа не сохраняется', async ({ page }) => {
  await register(page);

  const created = await page.request.post('/api/tests', {
    data: {
      title: `Разметка ${stamp()}`,
      gradeScale: { '5': 85, '4': 70, '3': 50 },
      questions: [
        {
          type: 'SINGLE_CHOICE',
          content: '<p>Вопрос<script>alert(1)</script></p>',
          points: 1,
          options: [
            {
              id: 'o1',
              content: '<p><b>жирный</b><script>alert(2)</script></p>',
            },
            {
              id: 'o2',
              content: '<p onclick="alert(3)">второй<img src="https://example.com/x.png"></p>',
            },
          ],
          answerKey: { correct: ['o1'] },
        },
      ],
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  const detail = await (await page.request.get(`/api/tests/${(await created.json()).id}`)).json();
  const question = detail.questions[0];
  const markup = [question.content, ...question.options.map((o: { content: string }) => o.content)].join(' ');

  expect(markup).not.toContain('<script');
  expect(markup).not.toContain('onclick');
  expect(markup).not.toContain('example.com');
  // Разрешённое — на месте.
  expect(question.options[0].content).toContain('<b>жирный</b>');
});
