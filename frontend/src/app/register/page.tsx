'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Icon } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { SchoolForm, type SchoolFormValues } from '@/components/landing/SchoolForm';
import { Credentials } from '@/components/landing/Credentials';
import { Footer } from '@/components/landing/Footer';
import type { SchoolCredentials } from '@/lib/types';

export default function RegisterPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<SchoolCredentials | null>(null);

  async function submit(values: SchoolFormValues) {
    setBusy(true);
    setError('');
    try {
      setCreated(
        await api.post<SchoolCredentials>('/schools/register', {
          schoolName: values.schoolName.trim(),
          city: values.city.trim(),
          lastName: values.lastName.trim(),
          firstName: values.firstName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          acceptTerms: values.acceptTerms,
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-12 bg-accent text-on-accent relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-72 h-72 border-[24px] border-on-accent/10" />
          <div className="absolute right-20 bottom-24 w-40 h-40 bg-on-accent/10" />
          <Link href="/" className="flex items-center gap-2.5 relative">
            <span className="w-9 h-9 bg-on-accent text-accent flex items-center justify-center">
              <Icon name="graduation" size={20} />
            </span>
            <span className="text-xl font-extrabold tracking-normal">edway.space</span>
          </Link>
          <div className="relative">
            <h1 className="text-4xl font-extrabold leading-tight tracking-normal">
              Две недели
              <br />
              бесплатно
            </h1>
            <p className="mt-4 max-w-sm text-on-accent/80 text-sm leading-relaxed">
              Школа заводится сразу и работает полностью. Успеете провести настоящую контрольную и
              посмотреть, как платформа читает почерк ваших учеников. Карта не нужна.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md ng-enter">
            <div className="lg:hidden mb-8">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="w-8 h-8 bg-accent text-on-accent flex items-center justify-center">
                  <Icon name="graduation" size={17} />
                </span>
                <span className="font-extrabold text-ink">
                  edway<span className="text-accent">.space</span>
                </span>
              </Link>
            </div>

            {created ? (
              <Credentials login={created.login} password={created.temporaryPassword} />
            ) : (
              <>
                <div className="w-10 h-1 bg-accent mb-4" />
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-extrabold text-ink tracking-normal">
                    Регистрация школы
                  </h1>
                  <Badge variant="accent">14 дней</Badge>
                </div>
                <p className="text-muted text-sm mb-8">
                  Заводит школу её представитель — директор, завуч или ответственный учитель.
                  Остальных сотрудников вы добавите сами.
                </p>

                <SchoolForm submitLabel="Создать школу" busy={busy} error={error} onSubmit={submit} />

                <p className="text-xs text-faint mt-6">
                  Уже зарегистрированы?{' '}
                  <Link href="/login" className="text-accent hover:underline">
                    Войти
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
