'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import {
  Badge,
  Button,
  Card,
  Chart,
  DateInput,
  EmptyState,
  PageHeader,
  Select,
  Table,
  Tile,
} from '@/lib/ui';
import { api, errorMessage, qs } from '@/lib/api';
import { notify } from '@/lib/notify';
import { cssVar } from '@/lib/theme';
import { formatDate, downloadText } from '@/lib/format';
import { GRADE_TONES } from '@/lib/catalog';
import type { GradeRow, GradeSummary, SchoolClass, TestSummary } from '@/lib/types';

export default function GradesPage() {
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [summary, setSummary] = useState<GradeSummary | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [classId, setClassId] = useState('');
  const [testId, setTestId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters = useMemo(() => qs({ classId, testId, from, to }), [classId, testId, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [journal, stats, classList, testList] = await Promise.all([
        api.get<GradeRow[]>(`/grades${filters}`),
        api.get<GradeSummary>(`/grades/summary${filters}`),
        api.get<SchoolClass[]>('/classes'),
        api.get<TestSummary[]>('/tests'),
      ]);
      setRows(journal);
      setSummary(stats);
      setClasses(classList);
      setTests(testList);
    } catch (e) {
      notify.error('Не удалось загрузить журнал', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    try {
      const res = await fetch(`/api/grades/export${filters}`, { credentials: 'include' });
      const text = await res.text();
      downloadText(`edway-grades-${new Date().toISOString().slice(0, 10)}.csv`, text);
    } catch (e) {
      notify.error('Не удалось выгрузить', { text: errorMessage(e) });
    }
  }

  const distributionConfig = useCallback((): ChartConfiguration<'doughnut'> => {
    const distribution = summary?.distribution ?? {};
    return {
      type: 'doughnut',
      data: {
        labels: ['Отлично', 'Хорошо', 'Удовлетворительно', 'Неудовлетворительно'],
        datasets: [
          {
            data: ['5', '4', '3', '2'].map((grade) => distribution[grade] ?? 0),
            backgroundColor: [
              cssVar('--ng-success'),
              cssVar('--ng-info'),
              cssVar('--ng-warning'),
              cssVar('--ng-danger'),
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
      },
    };
  }, [summary]);

  return (
    <>
      <PageHeader
        title="Оценки"
        subtitle="Журнал по дате, классу и тесту"
        actions={
          <>
            <Button variant="secondary" icon="refresh" onClick={load} loading={loading}>
              Обновить
            </Button>
            <Button icon="download" onClick={exportCsv} disabled={!rows.length}>
              Выгрузить CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Select
          value={classId}
          onChange={setClassId}
          label="Класс"
          options={classes.map((item) => ({ value: item.id, label: item.name }))}
          placeholder="Все классы"
          allowEmpty
        />
        <Select
          value={testId}
          onChange={setTestId}
          label="Тест"
          options={tests.map((item) => ({ value: item.id, label: item.title }))}
          placeholder="Все тесты"
          allowEmpty
        />
        <DateInput value={from} onChange={setFrom} label="С даты" />
        <DateInput value={to} onChange={setTo} label="По дату" />
      </div>

      {summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Tile solid label="Средний балл" value={summary.average || '—'} icon="award" hint={`${summary.graded} работ`} />
          <Tile label="Качество знаний" value={`${summary.quality}%`} icon="trendUp" hint="доля пятёрок и четвёрок" />
          <Tile label="Успеваемость" value={`${summary.success}%`} icon="checkCircle" hint="без двоек" />
          <Tile label="Средний процент" value={`${summary.percent}%`} icon="target" hint="от максимума за работу" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Журнал" padding={false} className="xl:col-span-2">
          {rows.length ? (
            <Table
              columns={[
                { key: 'date', label: 'Дата', width: '110px' },
                { key: 'class', label: 'Класс', width: '80px' },
                { key: 'student', label: 'Ученик' },
                { key: 'test', label: 'Тест', hideOnMobile: true },
                { key: 'score', label: 'Баллы', align: 'right', width: '100px' },
                { key: 'grade', label: 'Оценка', align: 'right', width: '90px' },
              ]}
              rows={rows}
              rowKey={(row) => row.workId}
              className="border-0"
              row={(row) => (
                <>
                  <td className="px-4 py-3 align-middle text-xs text-muted whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Badge variant="neutral">{row.className}</Badge>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <a href={`/works/${row.workId}`} className="text-sm font-semibold text-ink hover:text-accent">
                      {row.studentName}
                    </a>
                    <div className="text-xs text-faint md:hidden">{row.testTitle}</div>
                  </td>
                  <td className="px-4 py-3 align-middle text-xs text-muted hidden md:table-cell">
                    {row.testTitle}
                  </td>
                  <td className="px-4 py-3 align-middle text-right text-sm tabular-nums text-ink">
                    {row.score} / {row.maxScore}
                    <span className="block text-xs text-faint">{row.percent}%</span>
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    {row.grade ? <Badge variant={GRADE_TONES[row.grade]}>{row.grade}</Badge> : '—'}
                  </td>
                </>
              )}
            />
          ) : (
            <EmptyState
              icon="award"
              title="Оценок пока нет"
              description="Здесь появятся проверенные работы: по дате, классу и тесту."
              actions={
                <Button href="/assignments" icon="calendar">
                  К назначениям
                </Button>
              }
            />
          )}
        </Card>

        <Card title="Распределение" subtitle="По выбранной выборке">
          {summary?.graded ? (
            <Chart config={distributionConfig} height={280} />
          ) : (
            <EmptyState icon="pieChart" title="Нет данных" />
          )}
        </Card>
      </div>
    </>
  );
}
