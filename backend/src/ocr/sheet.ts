/**
 * Геометрия бланка ответов — единственный источник истины и для печати,
 * и для распознавания. Фронтенд получает эту разметку с сервера и печатает
 * лист миллиметр в миллиметр, поэтому нарезка скана попадает ровно в клетки.
 *
 * Система координат: миллиметры от левого верхнего угла листа A4.
 */
import { SnapshotQuestion, TestSnapshot } from '../tests/scoring';

export const SHEET = {
  width: 210,
  height: 297,
  /** Реперные квадраты по углам: по ним скан выравнивается. */
  markerSize: 8,
  markerInset: 10,
  /** Рабочее поле внутри маркеров. */
  left: 22,
  right: 188,
  /** Первая строка ответов на листе с шапкой и на продолжении. */
  firstRowY: 68,
  contRowY: 34,
  lastRowY: 268,
  rowHeight: 13.5,
  numberWidth: 9,
  cellWidth: 8,
  cellHeight: 10,
  cellGap: 1.6,
  /** Окно с кодом работы: печатается моноширинно и читается первым. */
  code: { x: 132, y: 13.5, width: 56, height: 9 },
} as const;

export const MAX_CELLS = Math.floor(
  (SHEET.right - (SHEET.left + SHEET.numberWidth + 3) + SHEET.cellGap) / (SHEET.cellWidth + SHEET.cellGap),
);

export interface CellBox {
  /** Порядковый номер клетки в ответе — по нему собирается строка. */
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetRow {
  questionId: string;
  /** Номер задания, как он напечатан на бланке. */
  number: number;
  type: SnapshotQuestion['type'];
  points: number;
  /** Подпись под клетками: «буква варианта», «до 3 букв», «ответ словом». */
  hint: string;
  y: number;
  cells: CellBox[];
}

export interface SheetPage {
  index: number;
  /** Шапка печатается только на первой странице. */
  header: boolean;
  rows: SheetRow[];
}

export interface SheetLayout {
  pages: SheetPage[];
  /** Задания, которые в бланк не попадают: их пишут на обороте. */
  extended: { questionId: string; number: number; points: number }[];
  sheet: typeof SHEET;
}

function hintFor(question: SnapshotQuestion, cells: number): string {
  if (question.type === 'SINGLE_CHOICE') {
    const letters = question.options.map((o) => o.letter).join(', ');
    return `одна буква: ${letters}`;
  }
  if (question.type === 'MULTIPLE_CHOICE') {
    return `буквы верных вариантов, по одной в клетке (до ${cells})`;
  }
  return 'ответ печатными буквами, по одному знаку в клетке';
}

function rowCells(count: number, y: number): CellBox[] {
  const startX = SHEET.left + SHEET.numberWidth + 3;
  return Array.from({ length: count }, (_, index) => ({
    index,
    x: startX + index * (SHEET.cellWidth + SHEET.cellGap),
    y,
    width: SHEET.cellWidth,
    height: SHEET.cellHeight,
  }));
}

/** Раскладывает задания снимка по страницам бланка. */
export function buildSheetLayout(snapshot: TestSnapshot): SheetLayout {
  const pages: SheetPage[] = [];
  const extended: SheetLayout['extended'] = [];

  let page: SheetPage = { index: 0, header: true, rows: [] };
  let y: number = SHEET.firstRowY;

  snapshot.questions.forEach((question, index) => {
    const number = index + 1;
    if (question.type === 'EXTENDED' || question.cells === 0) {
      extended.push({ questionId: question.id, number, points: question.points });
      return;
    }

    if (y + SHEET.rowHeight > SHEET.lastRowY) {
      pages.push(page);
      page = { index: pages.length, header: false, rows: [] };
      y = SHEET.contRowY;
    }

    const cells = Math.min(question.cells, MAX_CELLS);
    page.rows.push({
      questionId: question.id,
      number,
      type: question.type,
      points: question.points,
      hint: hintFor(question, cells),
      y,
      cells: rowCells(cells, y),
    });
    y += SHEET.rowHeight;
  });

  if (page.rows.length || !pages.length) {
    pages.push(page);
  }

  return { pages, extended, sheet: SHEET };
}
