'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader, Table } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDateTime } from '@/lib/format';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES } from '@/lib/catalog';
import type { PlatformPaymentRow } from '@/lib/types';

export default function PlatformPaymentsPage() {
  const [rows, setRows] = useState<PlatformPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get<PlatformPaymentRow[]>('/platform/payments'));
    } catch (e) {
      notify.error('Не удалось загрузить платежи', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const succeeded = rows.filter((row) => row.status === 'SUCCEEDED');
  const total = succeeded.reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <PageHeader
        title="Платежи"
        subtitle={`Оплачено ${succeeded.length} из ${rows.length} · ${(total / 100).toLocaleString('ru-RU')} ₽`}
        actions={
          <Button variant="secondary" icon="refresh" onClick={load} loading={loading}>
            Обновить
          </Button>
        }
      />

      {!loading && !rows.length ? (
        <Card padding={false}>
          <EmptyState icon="award" title="Платежей ещё не было" />
        </Card>
      ) : (
        <Table
          columns={[
            { key: 'date', label: 'Дата', width: '190px' },
            { key: 'school', label: 'Школа' },
            { key: 'payer', label: 'Плательщик', hideOnMobile: true },
            { key: 'status', label: 'Состояние', width: '160px' },
            { key: 'amount', label: 'Сумма', align: 'right', width: '120px' },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
          row={(row) => (
            <>
              <td className="px-4 py-3 align-middle text-xs text-muted">
                {formatDateTime(row.succeededAt ?? row.createdAt)}
              </td>
              <td className="px-4 py-3 align-middle">
                <div className="text-sm font-semibold text-ink">{row.schoolName}</div>
                <code className="text-[11px] text-faint">{row.externalId}</code>
              </td>
              <td className="px-4 py-3 align-middle text-xs text-muted hidden md:table-cell">
                {row.payerEmail || '—'}
              </td>
              <td className="px-4 py-3 align-middle">
                <Badge variant={PAYMENT_STATUS_TONES[row.status]} dot>
                  {PAYMENT_STATUS_LABELS[row.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 align-middle text-right text-sm font-bold text-ink tabular-nums">
                {row.amountLabel}
              </td>
            </>
          )}
        />
      )}
    </>
  );
}
