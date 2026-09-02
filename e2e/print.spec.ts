import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { dismissToasts, fillField, freeClass, open, register, stamp } from './helpers';
import type { SheetsResponse } from './types';

const run = promisify(execFile);

/**
 * Печать «как на принтере»: страница уходит в PDF без фоновой графики —
 * именно так браузер печатает по умолчанию. Растеризованный лист скармливаем
 * платформе как скан: если угловые метки нарисованы фоном, распознавание
 * на этом и споткнётся.
 */
test('напечатанный лист без фоновой графики распознаётся', async ({ page }) => {
  test.slow();
  await register(page);
  await dismissToasts(page);

  await open(page, '/classes');
  const target = await freeClass(page);
  await page.getByRole('button', { name: 'Создать класс' }).first().click();
  await page.getByLabel('Номер').selectOption(String(target.number));
  await page.getByLabel('Буква').selectOption(target.letter);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await dismissToasts(page);
  await page.getByRole('button', { name: `Класс ${target.name}` }).click();
  await fillField(page, page.getByRole('textbox'), 'Печатнов Артём');
  await page.getByRole('button', { name: 'Сохранить список' }).click();
  await dismissToasts(page);

  const classes = await (await page.request.get('/api/classes')).json();
  const classId = classes.find((item: { name: string }) => item.name === target.name).id;

  const created = await page.request.post('/api/tests', {
    data: {
      title: `Печатный тест ${stamp()}`,
      questions: [
        {
          type: 'SINGLE_CHOICE',
          content: '<p>Выберите верное</p>',
          points: 2,
          options: [
            { id: 'o1', content: 'Первое' },
            { id: 'o2', content: 'Второе' },
          ],
          answerKey: { correct: ['o2'] },
        },
      ],
    },
  });
  const testId = (await created.json()).id as string;
  await page.request.post(`/api/tests/${testId}/publish`);

  const assignment = await page.request.post('/api/assignments', {
    data: { testId, classId, date: '2026-11-12', spare: 0 },
  });
  const assignmentId = (await assignment.json()).id as string;
  const sheets = (await (
    await page.request.get(`/api/assignments/${assignmentId}/sheets`)
  ).json()) as SheetsResponse;
  const work = sheets.works[0];
  const rows = sheets.layouts[String(work.variant)].pages[0].rows;

  // ─── Заполняем бланк и печатаем страницу в PDF ───────────────────────────
  await open(page, `/print/${assignmentId}`);
  await page.getByRole('combobox').selectOption('sheets');
  await expect(page.locator('.sheet-page').first()).toBeVisible();

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
    { rows, answers: { [rows[0].questionId]: 'Б' } as Record<string, string> },
  );

  const dir = await fs.mkdtemp(join(tmpdir(), 'edway-print-'));
  const pdfPath = join(dir, 'sheet.pdf');
  try {
    // printBackground: false — поведение принтера по умолчанию.
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: false, margin: undefined });

    // Растеризуем первую страницу в 200 dpi — типичное разрешение сканера.
    await run('pdftoppm', ['-png', '-r', '200', '-f', '1', '-l', '1', pdfPath, join(dir, 'page')]);
    const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.png')).sort();
    expect(files.length, 'pdftoppm не отдал ни одной страницы').toBeGreaterThan(0);
    const image = await fs.readFile(join(dir, files[0]));

    const upload = await page.request.post(`/api/assignments/${assignmentId}/scans`, {
      multipart: { files: { name: 'print.png', mimeType: 'image/png', buffer: image } },
    });
    const outcome = await upload.json();

    // Метки на месте — иначе лист не выровнять и код не прочитать.
    expect(outcome.unmatched, JSON.stringify(outcome)).toHaveLength(0);
    expect(outcome.matched[0].code).toBe(work.code);

    const detail = await (await page.request.get(`/api/works/${outcome.matched[0].workId}`)).json();
    expect(detail.answers[0].raw, JSON.stringify(detail.answers)).toBe('Б');
    expect(detail.answers[0].correct).toBe(true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
