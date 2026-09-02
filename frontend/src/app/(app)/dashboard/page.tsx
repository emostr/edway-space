'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { Badge, Button, Card, Chart, EmptyState, PageHeader, Skeleton, Table, Tile } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { cssVar } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { countLabel, dayLabel, formatDate } from '@/lib/format';
import type { Overview } from '@/lib/types';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<Overview>('/analytics/overview'));
    } catch (e) {
      notify.error('Не удалось загрузить сводку', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = profile?.fullName.split(' ').slice(1).join(' ') || profile?.fullName || '';

  const activityConfig = useCallback((): ChartConfiguration<'line'> => {
    const points = data?.activity ?? [];
    return {
      type: 'line',
      data: {
        labels: points.map((point) => dayLabel(point.date)),
        datasets: [
          {
            label: 'Проверено работ',
            data: points.map((point) => point.checked),
            borderColor: cssVar('--ng-accent'),
            backgroundColor: `${cssVar('--ng-accent')}22`,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: cssVar('--ng-line') } },
        },
      },
    };
  }, [data]);

  const gradesConfig = useCallback((): ChartConfiguration<'bar'> => {
    const distribution = data?.distribution ?? {};
    return {
      type: 'bar',
      data: {
        labels: ['5', '4', '3', '2'],
        datasets: [
          {
            label: 'Работ',
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
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: cssVar('--ng-line') } },
        },
      },
    };
  }, [data]);

  return (
    <>
      <PageHeader
        title="Обзор"
        subtitle={`Здравствуйте, ${firstName}. Вот что происходит с вашими работами.`}
        actions={
          <>
            <Button variant="secondary" icon="refresh" onClick={load} loading={loading}>
              Обновить
            </Button>
            <Button href="/assignments" icon="plus">
              Назначить тест
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="border border-line bg-surface p-5 min-h-[128px]">
              <Skeleton rows={2} />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile
              solid
              label="Проверено работ"
              value={data.tiles.checked}
              icon="clipboardCheck"
              hint={`${data.tiles.checkedLast30} за последние 30 дней`}
            />
            <Tile
              label="Ждут проверки"
              value={data.tiles.pending}
              icon="clock"
              hint="распознаны, но оценка не выставлена"
              href="/assignments"
            />
            <Tile
              label="Средний балл"
              value={data.tiles.average || '—'}
              icon="award"
              hint="по всем проверенным работам"
              href="/grades"
            />
            <Tile
              label="Тестов"
              value={data.tiles.tests}
              icon="clipboard"
              hint={countLabel(data.tiles.classes, 'класс', 'класса', 'классов')}
              href="/tests"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            <Card title="Проверки за месяц" subtitle="Сколько работ вы закрыли по дням" className="xl:col-span-2">
              {data.activity.some((point) => point.checked > 0) ? (
                <Chart config={activityConfig} height={240} />
              ) : (
                <EmptyState
                  icon="activity"
                  title="Пока тихо"
                  description="За последний месяц не проверено ни одной работы. Назначьте тест классу и распечатайте бланки."
                  actions={
                    <Button href="/assignments" icon="plus">
                      Назначить тест
                    </Button>
                  }
                />
              )}
            </Card>

            <Card title="Оценки" subtitle="Распределение по всем работам">
              {data.tiles.checked ? (
                <Chart config={gradesConfig} height={240} />
              ) : (
                <EmptyState icon="award" title="Оценок ещё нет" />
              )}
            </Card>
          </div>

          <Card
            title="Последние назначения"
            padding={false}
            className="mt-6"
            actions={
              <Button size="sm" variant="ghost" iconRight="arrowRight" href="/assignments">
                Все
              </Button>
            }
          >
            {data.recent.length ? (
              <Table
                columns={[
                  { key: 'test', label: 'Тест' },
                  { key: 'class', label: 'Класс', hideOnMobile: true },
                  { key: 'date', label: 'Дата', hideOnMobile: true },
                  { key: 'progress', label: 'Проверено', align: 'right' },
                ]}
                rows={data.recent}
                rowKey={(row) => row.id}
                className="border-0"
                row={(row) => (
                  <>
                    <td className="px-4 py-3 align-middle">
                      <a href={`/assignments/${row.id}`} className="font-semibold text-ink hover:text-accent">
                        {row.testTitle}
                      </a>
                      <div className="text-xs text-faint md:hidden">
                        {row.className} · {formatDate(row.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle hidden md:table-cell">
                      <Badge variant="neutral">{row.className}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle text-muted text-xs hidden md:table-cell">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <Badge variant={row.checked === row.total ? 'success' : 'warning'}>
                        {row.checked} / {row.total}
                      </Badge>
                    </td>
                  </>
                )}
              />
            ) : (
              <EmptyState
                icon="calendar"
                title="Назначений пока нет"
                description="Создайте тест, назначьте его классу на дату — платформа сама подготовит бланки."
                actions={
                  <Button href="/tests/new" icon="plus">
                    Создать тест
                  </Button>
                }
              />
            )}
          </Card>
        </>
      ) : null}
    </>
  );
}
