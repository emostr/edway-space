'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Badge, Card, Icon } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { SchoolForm, type SchoolFormValues } from '@/components/landing/SchoolForm';
import type { CheckoutResult, Plan } from '@/lib/types';

export default function BuyPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setPlan(await api.get<Plan>('/billing/plan'));
    } catch {
      /* цена подставится из разметки страницы */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(values: SchoolFormValues) {
    setBusy(true);
    setError('');
    try {
      const result = await api.post<CheckoutResult>('/billing/purchase', {
        schoolName: values.schoolName.trim(),
        city: values.city.trim(),
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        acceptTerms: values.acceptTerms,
      });
      if (!result.confirmationUrl) {
        setError('Платёжная система не вернула ссылку на оплату. Попробуйте ещё раз.');
        return;
      }
      // Дальше ведёт касса: на её странице вводится карта, к нам она вернёт
      // покупателя на /pay/result.
      window.location.href = result.confirmationUrl;
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <main className="flex-1 px-4 sm:px-6 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="w-10 h-1 bg-accent mb-4" />
            <h1 className="text-3xl font-extrabold text-ink tracking-normal">Оплата подписки</h1>
            <p className="text-muted mt-3">
              Школа создаётся сразу после оплаты, логин и временный пароль администратора появятся на
              странице возврата и придут на указанную почту вместе с чеком.
            </p>

            <Card title="Что входит" className="mt-8">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold text-ink">
                  {plan?.amountLabel ?? '14 900 ₽'}
                </span>
                <span className="text-muted mb-1">за 12 месяцев</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {[
                  'Вся школа: сколько угодно учителей и классов',
                  'Автопроверка бланков и печать комплектов',
                  'Журнал оценок и разбор заданий',
                  'Поддержка и обновления весь срок',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink">
                    <Icon name="check" size={17} className="text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {plan && !plan.live ? (
              <Alert variant="warning" title="Касса в учебном режиме" className="mt-4">
                Платёжные ключи на этом сервере не заданы: оплата пройдёт по кругу, но деньги не
                спишутся. Так проверяют платформу до подключения кассы.
              </Alert>
            ) : null}

            <p className="text-xs text-faint mt-4">
              Нужен счёт для бухгалтерии или договор — напишите нам, выставим. Пока не готовы
              платить,{' '}
              <Link href="/register" className="text-accent hover:underline">
                возьмите две недели бесплатно
              </Link>
              .
            </p>
          </div>

          <div>
            <Card title="Данные школы" subtitle="На них будет оформлена подписка">
              <SchoolForm
                submitLabel={`Оплатить ${plan?.amountLabel ?? '14 900 ₽'}`}
                busy={busy}
                error={error}
                onSubmit={submit}
              />
            </Card>
            <p className="text-xs text-faint mt-4">
              Нажимая «Оплатить», вы переходите на защищённую страницу ЮKassa. Данные карты платформе
              не передаются.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
