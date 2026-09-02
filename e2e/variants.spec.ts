import { expect, test } from '@playwright/test';
import { dismissToasts, fillField, freeClass, open, register, stamp } from './helpers';
import type { SheetsResponse } from './types';

/**
 * Работа в двух вариантах: соседи по парте получают разные наборы заданий,
 * бланк печатается по своему варианту, а проверка идёт по его же ключам.
 * Заодно проверяется лист под развёрнутый ответ — он печатается следом за
 * бланком, с тем же кодом в углу.
 */
// Лист снимается в тройном разрешении — примерно то же, что даёт сканер 300 dpi.
test.use({ deviceScaleFactor: 3 });

test('два варианта: у каждого свой бланк, свой ключ и свой лист для развёрнутого', async ({ page }) => {
  test.slow();
  await register(page);
  await dismissToasts(page);

  // ─── Класс из четырёх учеников ───────────────────────────────────────────
  await open(page, '/classes');
  const target = await freeClass(page);
  await page.getByRole('button', { name: 'Создать класс' }).first().click();
  await page.getByLabel('Номер').selectOption(String(target.number));
  await page.getByLabel('Буква').selectOption(target.letter);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await dismissToasts(page);

  await page.getByRole('button', { name: `Класс ${target.name}` }).click();
  await fillField(page, page.getByRole('textbox'), 'Первый Иван\nВторой Пётр\nТретья Анна\nЧетвёртый Олег');
  await page.getByRole('button', { name: 'Сохранить список' }).click();
  await dismissToasts(page);

  const classes = await (await page.request.get('/api/classes')).json();
  const classId = classes.find((item: { name: string }) => item.name === target.name).id;

  // ─── Тест из двух вариантов ──────────────────────────────────────────────
  const title = `Два варианта ${stamp()}`;
  const created = await page.request.post('/api/tests', {
    data: {
      title,
      variantCount: 2,
      questions: [
        // Общее задание — попадёт в оба бланка.
        {
          type: 'SINGLE_CHOICE',
          variant: 0,
          content: '<p>Общий вопрос</p>',
          points: 2,
          options: [
            { id: 'a', content: 'Да' },
            { id: 'b', content: 'Нет' },
          ],
          answerKey: { correct: ['a'] },
        },
        {
          type: 'SHORT_ANSWER',
          variant: 1,
          content: '<p>Сколько будет 2 + 2?</p>',
          points: 3,
          options: [],
          answerKey: { accepted: ['4'], numeric: true },
        },
        {
          type: 'SHORT_ANSWER',
          variant: 2,
          content: '<p>Сколько будет 3 + 3?</p>',
          points: 3,
          options: [],
          answerKey: { accepted: ['6'], numeric: true },
        },
        {
          type: 'EXTENDED',
          variant: 0,
          content: '<p>Объясните решение</p>',
          points: 5,
          options: [],
          answerKey: { guideline: 'Ход рассуждения записан полностью' },
        },
      ],
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const testId = (await created.json()).id as string;
  await page.request.post(`/api/tests/${testId}/publish`);

  // ─── Назначение: варианты раздаются по списку ────────────────────────────
  const assignmentResponse = await page.request.post('/api/assignments', {
    data: { testId, classId, date: '2026-11-05', spare: 0 },
  });
  expect(assignmentResponse.ok(), await assignmentResponse.text()).toBeTruthy();
  const assignmentId = (await assignmentResponse.json()).id as string;

  const sheets = (await (
    await page.request.get(`/api/assignments/${assignmentId}/sheets`)
  ).json()) as SheetsResponse;

  expect(sheets.variantCount).toBe(2);
  expect(sheets.works.map((work) => work.variant)).toEqual([1, 2, 1, 2]);

  // В каждом варианте по два задания с клетками плюс развёрнутое на своём листе.
  for (const variant of ['1', '2']) {
    const layout = sheets.layouts[variant];
    const answerPages = layout.pages.filter((page) => page.kind === 'answers');
    const essayPages = layout.pages.filter((page) => page.kind === 'essay');
    expect(answerPages).toHaveLength(1);
    expect(essayPages).toHaveLength(1);
    expect(answerPages[0].rows).toHaveLength(2);
    expect(essayPages[0].blocks).toHaveLength(1);
    expect(essayPages[0].blocks[0].rules.length).toBeGreaterThan(3);
    expect(layout.extended).toHaveLength(1);
  }

  // ─── Печать: бланк, лист развёрнутого и по листу заданий на вариант ──────
  await open(page, `/print/${assignmentId}`);
  await expect(page.locator('.sheet-page').first()).toBeVisible();
  // На каждую из четырёх работ по комплекту: задания, бланк и лист развёрнутых.
  await expect(page.locator('.sheet-page')).toHaveCount(4 * 3);
  await expect(page.getByText('вариант 1').first()).toBeVisible();
  await expect(page.getByText('Задание 3 · 5 б.').first()).toBeVisible();

  // Комплект собран на ученика: сначала его задания, следом его бланк и лист
  // под развёрнутый ответ — пачку из принтера остаётся разложить по партам.
  const firstKit = page.locator('.sheet-page').nth(0);
  await expect(firstKit).toContainText(sheets.works[0].studentName);
  await expect(firstKit).toContainText('2 + 2');
  await expect(page.locator('.sheet-page').nth(1)).toContainText('БЛАНК ОТВЕТОВ');
  await expect(page.locator('.sheet-page').nth(2)).toContainText('развёрнутые ответы');

  // У соседа по списку вариант другой — и задания в его листе тоже.
  const secondKit = page.locator('.sheet-page').nth(3);
  await expect(secondKit).toContainText(sheets.works[1].studentName);
  await expect(secondKit).toContainText('3 + 3');
  await expect(secondKit).not.toContainText('2 + 2');

  // ─── Проверка идёт по ключам своего варианта ────────────────────────────
  const detail = await (await page.request.get(`/api/assignments/${assignmentId}`)).json();
  const first = detail.works.find((work: { variant: number }) => work.variant === 1);
  const second = detail.works.find((work: { variant: number }) => work.variant === 2);

  const firstWork = await (await page.request.get(`/api/works/${first.id}`)).json();
  const secondWork = await (await page.request.get(`/api/works/${second.id}`)).json();
  expect(firstWork.questions).toHaveLength(3);
  expect(firstWork.questions[1].content).toContain('2 + 2');
  expect(secondWork.questions[1].content).toContain('3 + 3');
  expect(firstWork.maxScore).toBe(10);

  // «4» верен только в первом варианте.
  const firstAnswer = await page.request.patch(`/api/works/${first.id}/answers`, {
    data: { questionId: firstWork.questions[1].id, raw: '4' },
  });
  expect((await firstAnswer.json()).answers[1].correct).toBe(true);

  const secondAnswer = await page.request.patch(`/api/works/${second.id}/answers`, {
    data: { questionId: secondWork.questions[1].id, raw: '4' },
  });
  expect((await secondAnswer.json()).answers[1].correct).toBe(false);

  // ─── Скан бланка второго варианта читается его же разметкой ─────────────
  await page.request.post(`/api/works/${second.id}/reset`);
  const layout = sheets.layouts['2'];
  const rows = layout.pages[0].rows;
  const written: Record<string, string> = {
    [rows[0].questionId]: 'А',
    [rows[1].questionId]: '6',
  };

  await open(page, `/print/${assignmentId}`);
  await page.getByRole('combobox').selectOption('sheets');
  // Бланки печатаются в порядке работ, по две страницы на каждую:
  // у второй работы (вариант 2) бланк идёт третьим листом.
  const sheet = page.locator('.sheet-page').nth(2);
  await expect(sheet).toBeVisible();

  await page.evaluate(
    ({ rows: layoutRows, answers, sheetIndex }) => {
      const sheetEl = document.querySelectorAll<HTMLElement>('.sheet-page')[sheetIndex];
      for (const row of layoutRows) {
        const value = answers[row.questionId] ?? '';
        [...value].forEach((char, index) => {
          const cell = row.cells[index];
          if (!cell) {
            return;
          }
          const mark = document.createElement('span');
          mark.textContent = char;
          mark.style.cssText = [
            'position:absolute',
            `left:${cell.x}mm`,
            `top:${cell.y}mm`,
            `width:${cell.width}mm`,
            `height:${cell.height}mm`,
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'font-family:Arial, Helvetica, sans-serif',
            'font-size:6mm',
            'font-weight:600',
            'color:#000',
          ].join(';');
          sheetEl.appendChild(mark);
        });
      }
      document.querySelectorAll<HTMLElement>('.print-hide').forEach((el) => {
        el.style.display = 'none';
      });
    },
    { rows, answers: written, sheetIndex: 2 },
  );

  const image = await sheet.screenshot({ type: 'png' });
  const upload = await page.request.post(`/api/assignments/${assignmentId}/scans`, {
    multipart: { files: { name: 'sheet.png', mimeType: 'image/png', buffer: image } },
  });
  const outcome = await upload.json();
  expect(outcome.unmatched, JSON.stringify(outcome)).toHaveLength(0);
  expect(outcome.matched[0].workId).toBe(second.id);

  const scanned = await (await page.request.get(`/api/works/${second.id}`)).json();
  expect(scanned.answers[1].raw, JSON.stringify(scanned.answers)).toBe('6');
  expect(scanned.answers[1].correct).toBe(true);
});
