import { expect, test } from '@playwright/test';
import { dismissToasts, fillField, freeClass, open, register, stamp } from './helpers';
import type { SheetsResponse } from './types';

/**
 * Проверка распознавания целиком: платформа печатает бланк, тест «пишет» в его
 * клетки печатные знаки по той же разметке, снимок листа уходит на сервер как
 * скан — и оттуда должны вернуться те же ответы с посчитанными баллами.
 *
 * Лист снимается в тройном разрешении: так клетка 8 мм превращается в ~90 px,
 * то есть примерно в то же, что даёт сканер на 300 dpi.
 */
test.use({ deviceScaleFactor: 3 });

test('бланк со вписанными ответами распознаётся и проверяется сам', async ({ page }) => {
  test.slow();
  await register(page);
  await dismissToasts(page);

  const title = `Диктант ${stamp()}`;

  // ─── Класс из одного ученика ─────────────────────────────────────────────
  await open(page, '/classes');
  const target = await freeClass(page);
  await page.getByRole('button', { name: 'Создать класс' }).first().click();
  await page.getByLabel('Номер').selectOption(String(target.number));
  await page.getByLabel('Буква').selectOption(target.letter);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await dismissToasts(page);

  await page.getByRole('button', { name: `Класс ${target.name}` }).click();
  await fillField(page, page.getByRole('textbox'), 'Рукописный Олег');
  await page.getByRole('button', { name: 'Сохранить список' }).click();
  await dismissToasts(page);

  // ─── Тест: выбор варианта и краткий ответ ────────────────────────────────
  const classes = await (await page.request.get('/api/classes')).json();
  const classId = classes.find((item: { name: string }) => item.name === target.name).id;

  const test1 = await page.request.post('/api/tests', {
    data: {
      title,
      description: 'Проверка распознавания',
      instructions: 'Пишите печатными буквами.',
      gradeScale: { '5': 85, '4': 70, '3': 50 },
      questions: [
        {
          type: 'SINGLE_CHOICE',
          content: '<p>Столица Франции?</p>',
          points: 2,
          options: [
            { id: 'o1', content: 'Париж' },
            { id: 'o2', content: 'Лион' },
            { id: 'o3', content: 'Ницца' },
          ],
          answerKey: { correct: ['o2'] },
        },
        {
          type: 'SHORT_ANSWER',
          content: '<p>Сколько будет 12 умножить на 3?</p>',
          points: 3,
          options: [],
          answerKey: { accepted: ['36'], numeric: true },
        },
      ],
    },
  });
  expect(test1.ok()).toBeTruthy();
  const testId = (await test1.json()).id as string;
  await page.request.post(`/api/tests/${testId}/publish`);

  const created = await page.request.post('/api/assignments', {
    data: { testId, classId, date: '2026-09-20', spare: 0 },
  });
  expect(created.ok()).toBeTruthy();
  const assignmentId = (await created.json()).id as string;

  const sheets = (await (await page.request.get(`/api/assignments/${assignmentId}/sheets`)).json()) as SheetsResponse;
  const work = sheets.works[0];
  const rows = sheets.layouts[String(work.variant)].pages[0].rows;

  // Второй вариант — «Б», ответ на второе задание — «36».
  const written: Record<string, string> = {
    [rows[0].questionId]: 'Б',
    [rows[1].questionId]: '36',
  };

  // ─── Заполняем напечатанный бланк ────────────────────────────────────────
  await open(page, `/print/${assignmentId}`);
  await page.getByRole('combobox').selectOption('sheets');
  const sheet = page.locator('.sheet-page').first();
  await expect(sheet).toBeVisible();

  await page.evaluate(
    ({ rows: layoutRows, answers }) => {
      const sheetEl = document.querySelector('.sheet-page') as HTMLElement;
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
    },
    { rows, answers: written },
  );

  // Панель управления висит поверх листа и попала бы в снимок, закрыв верхние
  // метки, — при печати её убирает media print, здесь убираем руками.
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.print-hide').forEach((el) => {
      el.style.display = 'none';
    });
  });

  const image = await sheet.screenshot({ type: 'png' });
  expect(image.byteLength).toBeGreaterThan(10_000);

  // ─── Отправляем как скан ─────────────────────────────────────────────────
  const upload = await page.request.post(`/api/assignments/${assignmentId}/scans`, {
    multipart: {
      files: { name: 'sheet.png', mimeType: 'image/png', buffer: image },
    },
  });
  expect(upload.ok(), `${upload.status()}: ${await upload.text()}`).toBeTruthy();
  const outcome = await upload.json();

  // Код бланка прочитан — лист сам нашёл своего ученика.
  expect(outcome.unmatched, JSON.stringify(outcome)).toHaveLength(0);
  expect(outcome.matched).toHaveLength(1);
  expect(outcome.matched[0].code).toBe(work.code);

  // ─── Ответы разобраны и оценены ──────────────────────────────────────────
  const detail = await (await page.request.get(`/api/works/${outcome.matched[0].workId}`)).json();
  const first = detail.answers.find((a: { questionId: string }) => a.questionId === rows[0].questionId);
  const second = detail.answers.find((a: { questionId: string }) => a.questionId === rows[1].questionId);

  expect(first.raw, `распознано: ${JSON.stringify(detail.answers)}`).toBe('Б');
  expect(first.correct).toBe(true);
  expect(second.raw.replace(/\s/g, ''), `распознано: ${JSON.stringify(detail.answers)}`).toBe('36');
  expect(second.correct).toBe(true);
  expect(detail.autoScore).toBe(5);
  expect(detail.status).toBe('RECOGNIZED');

  // ─── Оценка попадает в журнал ────────────────────────────────────────────
  const finalized = await (
    await page.request.post(`/api/works/${outcome.matched[0].workId}/finalize`)
  ).json();
  expect(finalized.grade).toBe(5);
  expect(finalized.percent).toBe(100);
});
