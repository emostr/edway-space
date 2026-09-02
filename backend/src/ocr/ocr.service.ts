import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { SnapshotQuestion } from '../tests/scoring';
import { GreyImage, Point, createMapper, findMarkers, inkRatio, loadGrey, otsuThreshold } from './image';
import { SHEET, SheetLayout, SheetPage } from './sheet';
import { recognizeBatch, recognizeOne } from './tesseract';

/** Пустая клетка почти не содержит тёмного: всё, что ниже порога, не распознаём. */
const INK_EMPTY = 0.02;

const LETTER_WHITELIST = 'АБВГДЕЖЗИКABCDEGHIK';
const TEXT_WHITELIST =
  'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-+/()=<>';
const CODE_WHITELIST = '0123456789ABCDEFGHJKMNPQRSTVWXYZ-/';

export interface RecognizedAnswer {
  questionId: string;
  raw: string;
  /** Доля клеток, в которых что-то написано: по ней видно, отвечал ли ученик. */
  filled: number;
  /** 0..1 — насколько уверенно прочитаны непустые клетки. */
  confidence: number;
}

export interface RecognizedSheet {
  /** Код бланка, прочитанный из угла листа. */
  code: string;
  /** Номер страницы бланка, 0 — первая. */
  pageIndex: number;
  answers: RecognizedAnswer[];
  /** Наклон листа в градусах — попадает в отчёт учителю. */
  skewDeg: number;
}

export class SheetNotAlignedError extends Error {
  constructor() {
    super(
      'Не удалось найти на скане угловые метки бланка. Проверьте, что лист попал в кадр целиком, ' +
        'без обрезанных углов и сильного наклона.',
    );
  }
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger('Ocr');

  /**
   * Читает страницу скана: выравнивает лист по угловым меткам, узнаёт по коду
   * в углу, чей это бланк и какая это страница, режет клетки по той же
   * разметке, по которой бланк печатался, и распознаёт их пачками —
   * отдельно буквы вариантов, отдельно свободный текст.
   */
  async recognize(file: string, layout: SheetLayout): Promise<RecognizedSheet> {
    const workDir = await fs.mkdtemp(join(tmpdir(), 'edway-ocr-'));
    try {
      let image = await loadGrey(file);
      let threshold = otsuThreshold(image);
      let markers = findMarkers(image, threshold);

      // Заметный перекос выправляем и ищем метки заново: дальше вырезаем
      // клетки прямоугольниками, а на косом листе они бы поехали.
      if (markers && Math.abs(markers.skewDeg) > 0.4) {
        image = await loadGrey(file, -markers.skewDeg);
        threshold = otsuThreshold(image);
        const second = findMarkers(image, threshold);
        this.logger.log(`Лист повёрнут на ${markers.skewDeg.toFixed(1)}° — выравниваем`);
        markers = second ?? markers;
      }

      if (!markers) {
        throw new SheetNotAlignedError();
      }

      const mapper = createMapper(
        markers,
        { inset: SHEET.markerInset, size: SHEET.markerSize },
        SHEET.width,
        SHEET.height,
      );

      const flat = await this.flatten(image, workDir);
      const { code, pageIndex } = await this.readCode(flat, mapper, workDir);
      const page = layout.pages[pageIndex] ?? layout.pages[0];
      const answers = page
        ? await this.readRows(image, flat, threshold, mapper, page, workDir)
        : [];

      return { code, pageIndex, answers, skewDeg: markers.skewDeg };
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  /** Выровненное изображение кладём на диск: из него вырезаем клетки. */
  private async flatten(image: GreyImage, dir: string): Promise<string> {
    const file = join(dir, 'page.png');
    await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 1 } })
      .png()
      .toFile(file);
    return file;
  }

  private box(
    mapper: (x: number, y: number) => Point,
    rect: { x: number; y: number; width: number; height: number },
    padding = 0,
  ) {
    const corners = [
      mapper(rect.x + padding, rect.y + padding),
      mapper(rect.x + rect.width - padding, rect.y + padding),
      mapper(rect.x + padding, rect.y + rect.height - padding),
      mapper(rect.x + rect.width - padding, rect.y + rect.height - padding),
    ];
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const left = Math.round(Math.min(...xs));
    const top = Math.round(Math.min(...ys));
    return {
      left,
      top,
      width: Math.max(1, Math.round(Math.max(...xs) - left)),
      height: Math.max(1, Math.round(Math.max(...ys) - top)),
    };
  }

  /** В углу бланка напечатано «XXXX-XXXX/1»: код работы и номер страницы. */
  private async readCode(
    flat: string,
    mapper: (x: number, y: number) => Point,
    dir: string,
  ): Promise<{ code: string; pageIndex: number }> {
    const area = this.box(mapper, SHEET.code, 0.6);
    const file = join(dir, 'code.png');
    await sharp(flat)
      .extract(area)
      .resize({ height: 120, fit: 'inside', withoutEnlargement: false })
      .sharpen()
      .threshold(150)
      .png()
      .toFile(file);

    const text = await recognizeOne(file, dir, { psm: 7, lang: 'eng', whitelist: CODE_WHITELIST });
    const clean = text.replace(/[^0-9A-Za-z/]/g, '').toUpperCase();
    const [codePart, pagePart] = clean.split('/');
    const page = Number(pagePart);
    return {
      code: (codePart ?? '').slice(0, 8),
      pageIndex: Number.isFinite(page) && page > 0 ? page - 1 : 0,
    };
  }

  private async readRows(
    image: GreyImage,
    flat: string,
    threshold: number,
    mapper: (x: number, y: number) => Point,
    page: SheetPage,
    dir: string,
  ): Promise<RecognizedAnswer[]> {
    interface Slot {
      questionId: string;
      cellIndex: number;
      file: string;
      letters: boolean;
    }

    const byQuestion = new Map<string, { filled: number; total: number; chars: string[] }>();
    const slots: Slot[] = [];

    for (const row of page.rows) {
      const letters = row.type === 'SINGLE_CHOICE' || row.type === 'MULTIPLE_CHOICE';
      byQuestion.set(row.questionId, {
        filled: 0,
        total: row.cells.length,
        chars: new Array<string>(row.cells.length).fill(''),
      });

      for (const cell of row.cells) {
        // Отступ внутрь клетки: рамка не должна попасть в распознавание.
        const area = this.box(mapper, cell, 0.9);
        const ink = inkRatio(image, threshold, {
          x: area.left,
          y: area.top,
          width: area.width,
          height: area.height,
        });
        if (ink < INK_EMPTY) {
          continue;
        }

        const file = join(dir, `c-${row.number}-${cell.index}.png`);
        await sharp(flat)
          .extract(area)
          // Тессеракт увереннее читает крупный знак: поднимаем клетку до ~160 px.
          .resize({ height: 160, fit: 'inside', withoutEnlargement: false })
          .flatten({ background: '#ffffff' })
          .sharpen()
          .threshold(160)
          .extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff' })
          .png()
          .toFile(file);

        slots.push({ questionId: row.questionId, cellIndex: cell.index, file, letters });
        const state = byQuestion.get(row.questionId);
        if (state) {
          state.filled += 1;
        }
      }
    }

    const letterSlots = slots.filter((s) => s.letters);
    const textSlots = slots.filter((s) => !s.letters);

    const [letterText, freeText] = await Promise.all([
      recognizeBatch(
        letterSlots.map((s) => s.file),
        dir,
        { psm: 10, lang: 'rus', whitelist: LETTER_WHITELIST },
      ),
      recognizeBatch(
        textSlots.map((s) => s.file),
        dir,
        { psm: 10, lang: 'rus+eng', whitelist: TEXT_WHITELIST },
      ),
    ]);

    const confidence = new Map<string, { read: number; total: number }>();
    const apply = (slot: Slot, value: string) => {
      const state = byQuestion.get(slot.questionId);
      if (!state) {
        return;
      }
      const clean = (value ?? '').replace(/\s+/g, '').slice(0, 1);
      state.chars[slot.cellIndex] = clean;
      const score = confidence.get(slot.questionId) ?? { read: 0, total: 0 };
      score.total += 1;
      if (clean) {
        score.read += 1;
      }
      confidence.set(slot.questionId, score);
    };

    letterSlots.forEach((slot, index) => apply(slot, letterText[index] ?? ''));
    textSlots.forEach((slot, index) => apply(slot, freeText[index] ?? ''));

    return page.rows.map((row) => {
      const state = byQuestion.get(row.questionId);
      const score = confidence.get(row.questionId);
      const chars = state?.chars ?? [];
      const raw =
        row.type === 'SHORT_ANSWER'
          ? chars.join('').trim()
          : chars.filter(Boolean).join('');
      return {
        questionId: row.questionId,
        raw,
        filled: state && state.total ? state.filled / state.total : 0,
        confidence: score && score.total ? score.read / score.total : 1,
      };
    });
  }

  /** Подсказка для журнала: какие задания OCR трогать не станет. */
  manualOnly(questions: SnapshotQuestion[]): string[] {
    return questions.filter((q) => q.type === 'EXTENDED').map((q) => q.id);
  }
}
