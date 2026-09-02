'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { RichText } from '@/lib/rich';
import { formatDate } from '@/lib/format';
import { QUESTION_TYPE_LABELS } from '@/lib/catalog';
import type { SheetLayout, SheetsResponse, SnapshotQuestion } from '@/lib/types';

type Mode = 'sheets' | 'questions' | 'both';

export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SheetsResponse | null>(null);
  const [mode, setMode] = useState<Mode>('both');

  const load = useCallback(async () => {
    try {
      setData(await api.get<SheetsResponse>(`/assignments/${id}/sheets`));
    } catch (e) {
      notify.error('Не удалось подготовить бланки', { text: errorMessage(e) });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) {
      return 0;
    }
    const sheets = data.works.reduce(
      (sum, work) => sum + (data.layouts[String(work.variant)]?.pages.length ?? 0),
      0,
    );
    return (mode === 'questions' ? 0 : sheets) + (mode === 'sheets' ? 0 : data.variantCount);
  }, [data, mode]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-10 h-1 bg-accent animate-pulse" />
      </div>
    );
  }

  const variants = Array.from({ length: data.variantCount }, (_, index) => index + 1);

  return (
    <div className="min-h-screen bg-bg">
      <div className="print-hide sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" icon="arrowLeft" href={`/assignments/${id}`}>
            К назначению
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-ink truncate">{data.testTitle}</div>
            <div className="text-xs text-muted">
              {data.className} · {formatDate(data.date)} · листов к печати: {totalPages}
              {data.variantCount > 1 ? ` · вариантов: ${data.variantCount}` : ''}
            </div>
          </div>
          <Select
            value={mode}
            onChange={(value) => setMode(value as Mode)}
            options={[
              { value: 'both', label: 'Задания и бланки' },
              { value: 'questions', label: 'Только задания' },
              { value: 'sheets', label: 'Только бланки' },
            ]}
            className="w-56"
          />
          <Button icon="printer" onClick={() => window.print()}>
            Печать
          </Button>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <p className="text-xs text-faint">
            Печатайте в масштабе 100% без «вписать в страницу»: разметка бланка совпадает с сеткой,
            по которой платформа режет скан. Углы с чёрными квадратами обрезать нельзя.
          </p>
        </div>
      </div>

      <div className="py-6 flex flex-col items-center gap-6">
        {mode !== 'sheets'
          ? variants.map((variant) => <QuestionSheet key={variant} data={data} variant={variant} />)
          : null}
        {mode !== 'questions'
          ? data.works.map((work) => {
              const layout = data.layouts[String(work.variant)];
              if (!layout) {
                return null;
              }
              return layout.pages.map((page) => (
                <AnswerSheet
                  key={`${work.id}-${page.index}`}
                  data={data}
                  layout={layout}
                  work={work}
                  pageIndex={page.index}
                />
              ));
            })
          : null}
      </div>
    </div>
  );
}

/** Лист с самими заданиями: тексты, формулы и картинки. */
function QuestionSheet({ data, variant }: { data: SheetsResponse; variant: number }) {
  const questions: SnapshotQuestion[] =
    data.variantCount > 1
      ? data.snapshot.questions.filter((question) => !question.variant || question.variant === variant)
      : data.snapshot.questions;

  return (
    <section className="sheet-page shadow-2xl" style={{ padding: '16mm 14mm' }}>
      <div style={{ borderBottom: '0.5mm solid #000', paddingBottom: '4mm', marginBottom: '6mm' }}>
        <div style={{ fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {data.className} · {formatDate(data.date)}
          {data.variantCount > 1 ? ` · вариант ${variant}` : ''}
        </div>
        <h1 style={{ fontSize: '16pt', fontWeight: 800, margin: '2mm 0 0' }}>{data.testTitle}</h1>
        {data.instructions ? (
          <p style={{ fontSize: '9pt', marginTop: '3mm', lineHeight: 1.4 }}>{data.instructions}</p>
        ) : null}
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '10pt' }}>
        {questions.map((question, index) => (
          <li key={question.id} style={{ marginBottom: '5mm', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', gap: '3mm' }}>
              <span style={{ fontWeight: 800, minWidth: '6mm' }}>{index + 1}.</span>
              <div style={{ flex: 1 }}>
                <RichText html={question.content} />
                {question.options.length ? (
                  <div style={{ marginTop: '2mm', display: 'flex', flexWrap: 'wrap', gap: '2mm 6mm' }}>
                    {question.options.map((option) => (
                      <span key={option.id} style={{ display: 'flex', gap: '1.5mm' }}>
                        <b>{option.letter})</b>
                        <RichText html={option.content} />
                      </span>
                    ))}
                  </div>
                ) : null}
                <div style={{ fontSize: '8pt', marginTop: '1.5mm', color: '#555' }}>
                  {QUESTION_TYPE_LABELS[question.type]} · {question.points} б.
                  {question.type === 'EXTENDED' ? ' · ответ на отдельном листе' : ''}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface SheetProps {
  data: SheetsResponse;
  layout: SheetLayout;
  work: { id: string; code: string; variant: number; studentName: string };
  pageIndex: number;
}

/**
 * Лист работы. Все координаты берутся из разметки, которую отдал сервер, —
 * той же самой, по которой потом режется скан. Страницы двух видов: бланк
 * с клетками и поле под развёрнутый ответ.
 */
function AnswerSheet({ data, layout, work, pageIndex }: SheetProps) {
  const { sheet, pages, extended } = layout;
  const page = pages[pageIndex];
  const mm = (value: number) => `${value}mm`;
  const markerOffset = sheet.width - sheet.markerInset - sheet.markerSize;
  const markerBottom = sheet.height - sheet.markerInset - sheet.markerSize;

  const markers = [
    { left: sheet.markerInset, top: sheet.markerInset },
    { left: markerOffset, top: sheet.markerInset },
    { left: sheet.markerInset, top: markerBottom },
    { left: markerOffset, top: markerBottom },
  ];

  const variantLabel = data.variantCount > 1 ? ` · вариант ${work.variant}` : '';

  return (
    <section className="sheet-page shadow-2xl">
      {markers.map((marker, index) => (
        <svg
          key={index}
          className="sheet-marker"
          style={{ left: mm(marker.left), top: mm(marker.top) }}
          width={mm(sheet.markerSize)}
          height={mm(sheet.markerSize)}
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <rect x="0" y="0" width="10" height="10" fill="#000" />
        </svg>
      ))}

      <div
        className="sheet-code"
        style={{
          left: mm(sheet.code.x),
          top: mm(sheet.code.y),
          width: mm(sheet.code.width),
          height: mm(sheet.code.height),
          fontSize: '13pt',
        }}
      >
        {work.code.slice(0, 4)}-{work.code.slice(4)}/{pageIndex + 1}
      </div>

      {page.header ? (
        <>
          <div
            className="sheet-text"
            style={{ left: mm(sheet.left), top: mm(22), fontSize: '8pt', letterSpacing: '0.08em' }}
          >
            EDWAY.SPACE · БЛАНК ОТВЕТОВ
          </div>
          <div
            className="sheet-text"
            style={{ left: mm(sheet.left), top: mm(27), fontSize: '13pt', fontWeight: 800, width: mm(110) }}
          >
            {data.testTitle}
          </div>
          <div className="sheet-text" style={{ left: mm(sheet.left), top: mm(36), fontSize: '10pt' }}>
            {data.className} · {formatDate(data.date)}
            {variantLabel}
          </div>
          <div
            className="sheet-text"
            style={{ left: mm(sheet.left), top: mm(43), fontSize: '11pt', fontWeight: 700 }}
          >
            {work.studentName || 'Фамилия, имя: ______________________________'}
          </div>
          <div
            className="sheet-text"
            style={{
              left: mm(sheet.left),
              top: mm(50),
              width: mm(sheet.right - sheet.left),
              fontSize: '8pt',
              lineHeight: 1.35,
            }}
          >
            Пишите печатными буквами и цифрами, по одному знаку в клетке. Не выходите за границы клеток
            и не обрезайте углы листа с чёрными квадратами.
          </div>
          <div
            className="sheet-rule"
            style={{
              left: mm(sheet.left),
              top: mm(62),
              width: mm(sheet.right - sheet.left),
              borderTopWidth: '0.4mm',
            }}
          />
        </>
      ) : (
        <div
          className="sheet-text"
          style={{ left: mm(sheet.left), top: mm(20), fontSize: '9pt', fontWeight: 700, width: mm(150) }}
        >
          {data.testTitle} · {work.studentName || 'без фамилии'}
          {variantLabel} · {page.kind === 'essay' ? 'развёрнутые ответы' : `страница ${pageIndex + 1}`}
        </div>
      )}

      {page.rows.map((row) => (
        <div key={row.questionId}>
          <div
            className="sheet-text"
            style={{
              left: mm(sheet.left),
              top: mm(row.y + 2),
              width: mm(sheet.numberWidth),
              fontSize: '11pt',
              fontWeight: 800,
              textAlign: 'right',
            }}
          >
            {row.number}
          </div>
          {row.cells.map((cell) => (
            <span
              key={cell.index}
              className="sheet-cell"
              style={{
                left: mm(cell.x),
                top: mm(cell.y),
                width: mm(cell.width),
                height: mm(cell.height),
              }}
            />
          ))}
          <div
            className="sheet-text"
            style={{
              left: mm((row.cells.at(-1)?.x ?? sheet.left) + sheet.cellWidth + 3),
              top: mm(row.y + 3.5),
              fontSize: '7pt',
              color: '#666',
              width: mm(60),
            }}
          >
            {row.hint}
          </div>
        </div>
      ))}

      {/* Поле под развёрнутый ответ: заголовок задания и разлиновка. */}
      {page.blocks.map((block) => (
        <div key={block.questionId}>
          <div
            className="sheet-text"
            style={{
              left: mm(sheet.left),
              top: mm(block.y),
              width: mm(sheet.right - sheet.left),
              fontSize: '10pt',
              fontWeight: 800,
            }}
          >
            Задание {block.number} · {block.points} б.
          </div>
          {block.guideline ? (
            <div
              className="sheet-text"
              style={{
                left: mm(sheet.left),
                top: mm(block.y + 5),
                width: mm(sheet.right - sheet.left),
                fontSize: '7.5pt',
                color: '#666',
              }}
            >
              {block.guideline}
            </div>
          ) : null}
          {block.rules.map((line) => (
            <div
              key={line}
              className="sheet-rule"
              style={{
                left: mm(sheet.left),
                top: mm(line),
                width: mm(sheet.right - sheet.left),
                borderTopWidth: '0.2mm',
                borderTopColor: '#999',
              }}
            />
          ))}
        </div>
      ))}

      {page.kind === 'answers' && page.index === pages.filter((p) => p.kind === 'answers').length - 1 && extended.length ? (
        <div
          className="sheet-text"
          style={{
            left: mm(sheet.left),
            top: mm(sheet.lastRowY + 4),
            width: mm(sheet.right - sheet.left),
            fontSize: '8.5pt',
            lineHeight: 1.4,
          }}
        >
          <b>На отдельном листе:</b>{' '}
          {extended.map((item) => `задание ${item.number} (${item.points} б.)`).join(', ')}. Он идёт
          следом за этим бланком, с тем же кодом в углу.
        </div>
      ) : null}
    </section>
  );
}
