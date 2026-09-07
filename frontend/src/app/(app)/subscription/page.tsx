'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, Icon, PageHeader, Table } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDate } from '@/lib/format';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, SCHOOL_STATUS_LABELS, SCHOOL_STATUS_TONES } from '@/lib/catalog';
import { useAuth } from '@/lib/auth';
import type { CheckoutResult, PaymentRow, Plan, SchoolDetail } from '@/lib/types';

/**
 * Подписка школы. Сюда же попадает кабинет, когда срок вышел: работа
 * приостановлена, но данные целы, и единственное нужное действие — оплата.
 */
export default function SubscriptionPage() {
  const { profile } = useAuth();
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isAdmin = profile?.role === 'SCHOOL_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, currentPlan] = await Promise.all([
        api.get<SchoolDetail>('/schools/mine'),
        api.get<Plan>('/billing/plan'),
      ]);
      setSchool(detail);
      setPlan(currentPlan);
      if (isAdmin) {
        setPayments(await api.get<PaymentRow[]>('/billing/payments'));
      }
    } catch (e) {
      notify.error('Не удалось загрузить подписку', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay() {
    setBusy(true);
    try {
      const result = await api.post<CheckoutResult>('/billing/checkout', {
        email: school?.contactEmail || undefined,
      });
      if (!result.confirmationUrl) {
        notify.error('Платёжная система не вернула ссылку на оплату');
        return;
      }
      window.location.href = result.confirmationUrl;
    } catch (e) {
      notify.error('Не удалось начать оплату', { text: errorMessage(e) });
      setBusy(false);
    }
  }

  const expired = school && (school.status === 'EXPIRED' || school.status === 'BLOCKED');

  return (
    <>
      <PageHeader
        title="Подписка"
        subtitle={school?.name ?? 'Срок доступа и платежи'}
        actions={
          <Button variant="secondary" icon="refresh" onClick={load} loading={loading}>
            Обновить
          </Button>
        }
      />

      {expired ? (
        <Alert
          variant={school?.status === 'BLOCKED' ? 'danger' : 'warning'}
          title={
            school?.status === 'BLOCKED'
              ? 'Доступ закрыт администратором платформы'
              : 'Подписка закончилась'
          }
          className="mb-6"
        >
          Классы, тесты, работы и журнал на месте — они вернутся сразу после оплаты. Ничего не
          удаляется и не портится.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Состояние" className="lg:col-span-1">
          {school ? (
            <div className="space-y-4">
              <Badge variant={SCHOOL_STATUS_TONES[school.status]} dot>
                {SCHOOL_STATUS_LABELS[school.status]}
              </Badge>
              <div>
                <div className="ng-label text-muted">Доступ до</div>
                <div className="text-2xl font-extrabold text-ink mt-1">
                  {formatDate(school.paidUntil)}
                </div>
                <div className="text-xs text-faint mt-1">
                  {school.daysLeft >= 0 ? `осталось ${school.daysLeft} дн.` : `просрочено на ${-school.daysLeft} дн.`}
                </div>
              </div>
              <div className="text-sm text-muted">
                {school.counts.accounts} сотрудников · {school.counts.classes} классов ·{' '}
                {school.counts.assignments} назначений
              </div>
            </div>
          ) : null}
        </Card>

        <Card title="Продление" subtitle="Одна подписка на всю школу" className="lg:col-span-2" accent>
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-4xl font-extrabold text-ink">{plan?.amountLabel ?? '—'}</span>
            <span className="text-muted mb-1">за 12 месяцев</span>
          </div>

          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'Без ограничения числа учителей',
              'Автопроверка бланков',
              'Журнал оценок и выгрузка',
              'Поддержка и обновления',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink">
                <Icon name="check" size={16} className="text-accent shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          {plan && !plan.live ? (
            <Alert variant="info" className="mt-5">
              Касса на этом сервере в учебном режиме: оплата пройдёт по кругу, но деньги не спишутся.
            </Alert>
          ) : null}

          {isAdmin ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" icon="award" loading={busy} onClick={pay}>
                Оплатить {plan?.amountLabel ?? ''}
              </Button>
              <span className="text-xs text-faint">
                Оплаченные дни не сгорают: срок прибавится к остатку
              </span>
            </div>
          ) : (
            <Alert variant="info" className="mt-6">
              Оплатить подписку может администратор школы. Передайте ему, что срок подходит к концу.
            </Alert>
          )}
        </Card>
      </div>

      {isAdmin ? (
        <Card title="Платежи" padding={false} className="mt-6">
          {payments.length ? (
            <Table
              columns={[
                { key: 'date', label: 'Дата', width: '140px' },
                { key: 'description', label: 'Назначение' },
                { key: 'status', label: 'Состояние', width: '160px' },
                { key: 'amount', label: 'Сумма', align: 'right', width: '120px' },
              ]}
              rows={payments}
              rowKey={(row) => row.id}
              className="border-0"
              row={(row) => (
                <>
                  <td className="px-4 py-3 align-middle text-xs text-muted">
                    {formatDate(row.succeededAt ?? row.createdAt)}
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-ink">{row.description}</td>
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
          ) : (
            <EmptyState
              icon="award"
              title="Платежей ещё не было"
              description="Здесь появятся оплаты подписки — их можно показать бухгалтерии."
            />
          )}
        </Card>
      ) : null}
    </>
  );
}
