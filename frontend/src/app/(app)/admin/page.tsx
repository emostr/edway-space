'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader, Table, Tile } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDate } from '@/lib/format';
import { SCHOOL_STATUS_LABELS, SCHOOL_STATUS_TONES } from '@/lib/catalog';
import type { PlatformOverview, PlatformSchoolRow } from '@/lib/types';

export default function PlatformOverviewPage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [soon, setSoon] = useState<PlatformSchoolRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, schools] = await Promise.all([
        api.get<PlatformOverview>('/platform/overview'),
        api.get<PlatformSchoolRow[]>('/platform/schools'),
      ]);
      setOverview(data);
      // Кому пора продлевать: сроки на исходе или уже вышли.
      setSoon(
        schools
          .filter((school) => school.daysLeft <= 21)
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .slice(0, 12),
      );
    } catch (e) {
      notify.error('Не удалось загрузить сводку', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Платформа"
        subtitle="Школы, сроки и деньги"
        actions={
          <>
            <Button variant="secondary" icon="refresh" onClick={load} loading={loading}>
              Обновить
            </Button>
            <Button icon="plus" href="/admin/schools">
              Завести школу
            </Button>
          </>
        }
      />

      {overview ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile
              solid
              label="Выручка всего"
              value={overview.money.totalLabel}
              icon="award"
              hint={`${overview.money.payments} платежей`}
              href="/admin/payments"
            />
            <Tile
              label="За 30 дней"
              value={overview.money.monthLabel}
              icon="trendUp"
              hint={`школ пришло: ${overview.schools.newThisMonth}`}
            />
            <Tile
              label="Платят"
              value={overview.schools.active}
              icon="school"
              hint={`пробуют: ${overview.schools.trial}`}
              href="/admin/schools"
            />
            <Tile
              label="Скоро истекут"
              value={overview.schools.expiringSoon}
              icon="clock"
              hint={`просрочено: ${overview.schools.expired}`}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            <Card title="Школы" subtitle="По состоянию подписки">
              <div className="space-y-3">
                {[
                  ['TRIAL', 'Пробный период', overview.schools.trial],
                  ['ACTIVE', 'Оплачено', overview.schools.active],
                  ['EXPIRED', 'Срок вышел', overview.schools.expired],
                  ['BLOCKED', 'Закрыты', overview.schools.blocked],
                ].map(([status, label, count]) => (
                  <div key={String(status)} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">{label}</span>
                    <Badge variant={SCHOOL_STATUS_TONES[String(status)]}>{count}</Badge>
                  </div>
                ))}
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">Всего</span>
                  <span className="text-lg font-extrabold text-ink">{overview.schools.total}</span>
                </div>
              </div>
            </Card>

            <Card title="Пора продлевать" subtitle="Сроки на исходе" padding={false} className="xl:col-span-2">
              {soon.length ? (
                <Table
                  columns={[
                    { key: 'school', label: 'Школа' },
                    { key: 'status', label: 'Состояние', width: '180px' },
                    { key: 'until', label: 'Доступ до', align: 'right', width: '150px' },
                  ]}
                  rows={soon}
                  rowKey={(row) => row.id}
                  className="border-0"
                  row={(row) => (
                    <>
                      <td className="px-4 py-3 align-middle">
                        <a href="/admin/schools" className="font-semibold text-ink hover:text-accent">
                          {row.name}
                        </a>
                        <div className="text-xs text-faint">
                          {row.city || 'город не указан'} · {row.counts.accounts} сотрудников
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Badge variant={SCHOOL_STATUS_TONES[row.status]} dot>
                          {SCHOOL_STATUS_LABELS[row.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <div className="text-sm text-ink">{formatDate(row.paidUntil)}</div>
                        <div className="text-xs text-faint">
                          {row.daysLeft >= 0 ? `${row.daysLeft} дн.` : `просрочено ${-row.daysLeft} дн.`}
                        </div>
                      </td>
                    </>
                  )}
                />
              ) : (
                <EmptyState icon="checkCircle" title="Ближайшие три недели никто не истекает" />
              )}
            </Card>
          </div>
        </>
      ) : null}
    </>
  );
}
