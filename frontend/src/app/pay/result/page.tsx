'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Badge, Button, Card, Icon, Skeleton } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Credentials } from '@/components/landing/Credentials';
import { Footer } from '@/components/landing/Footer';
import type { PaymentResult } from '@/lib/types';

function PayResultView() {
  const params = useSearchParams();
  const paymentId = params.get('payment') ?? '';
  const demo = params.get('demo') === '1';

  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!paymentId) {
      setError('В ссылке нет номера платежа');
      return;
    }
    try {
      setResult(await api.get<PaymentResult>(`/billing/result/${paymentId}`));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [paymentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Настоящая касса подтверждает платёж уведомлением на сервер, и оно может
  // прийти на секунду позже возврата покупателя — поэтому опрашиваем.
  useEffect(() => {
    if (!result || result.status !== 'PENDING' || demo) {
      return;
    }
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [result, demo, load]);

  async function confirmDemo() {
    setBusy(true);
    try {
      await api.post(`/billing/result/${paymentId}/confirm`, {});
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-12">
        <div className="max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 mb-8">
            <span className="w-8 h-8 bg-accent text-on-accent flex items-center justify-center">
              <Icon name="graduation" size={17} />
            </span>
            <span className="font-extrabold text-ink">
              edway<span className="text-accent">.space</span>
            </span>
          </Link>

          {error ? (
            <Alert variant="danger" title="Не удалось показать платёж">
              {error}
            </Alert>
          ) : !result ? (
            <Card title="Проверяем платёж">
              <Skeleton rows={3} />
            </Card>
          ) : result.status === 'SUCCEEDED' ? (
            <>
              <Card title="Оплата прошла" accent className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success" dot>
                    {result.amountLabel}
                  </Badge>
                  <span className="text-sm text-muted">
                    {result.school.name} · доступ до {formatDate(result.school.paidUntil)}
                  </span>
                </div>
              </Card>

              {result.credentials ? (
                <Credentials
                  login={result.credentials.login}
                  password={result.credentials.temporaryPassword}
                  title="Доступ администратора школы"
                />
              ) : (
                <Card title="Подписка продлена">
                  <p className="text-sm text-muted">
                    Заходите в кабинет прежним логином — всё на месте.
                  </p>
                  <Button href="/login" className="mt-4" iconRight="arrowRight">
                    В кабинет
                  </Button>
                </Card>
              )}
            </>
          ) : (
            <Card title="Платёж ещё не подтверждён">
              <p className="text-sm text-muted">
                {demo
                  ? 'Касса на этом сервере работает в учебном режиме — подтвердите платёж кнопкой ниже. Денег это не тронет.'
                  : 'Касса сообщит о платеже в течение минуты. Страница обновится сама.'}
              </p>
              {demo ? (
                <Button className="mt-4" icon="check" loading={busy} onClick={confirmDemo}>
                  Подтвердить учебный платёж
                </Button>
              ) : null}
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PayResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <PayResultView />
    </Suspense>
  );
}
