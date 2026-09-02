'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Icon, Input } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Profile } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const { profile, ready, apply } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Уже вошедшего пускать на форму входа незачем.
  useEffect(() => {
    if (ready && profile) {
      router.replace('/dashboard');
    }
  }, [ready, profile, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!login.trim() || !password) {
      setError('Введите логин и пароль');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{ profile: Profile }>('/auth/login', {
        login: login.trim(),
        password,
      });
      apply(res.profile);
      router.replace('/dashboard');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-accent text-on-accent relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 border-[24px] border-on-accent/10" />
        <div className="absolute right-20 bottom-24 w-40 h-40 bg-on-accent/10" />
        <div className="flex items-center gap-2.5 relative">
          <span className="w-9 h-9 bg-on-accent text-accent flex items-center justify-center">
            <Icon name="graduation" size={20} />
          </span>
          <span className="text-xl font-extrabold tracking-normal">edway.space</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-extrabold leading-tight tracking-normal">
            Тесты,
            <br />
            бланки
            <br />и оценки
          </h1>
          <p className="mt-4 max-w-sm text-on-accent/80 text-sm leading-relaxed">
            Соберите работу в конструкторе, распечатайте бланки, отсканируйте написанное — платформа
            проверит закрытые задания сама и посчитает оценку.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm ng-enter">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="w-8 h-8 bg-accent text-on-accent flex items-center justify-center">
              <Icon name="graduation" size={17} />
            </span>
            <span className="font-extrabold text-ink">
              edway<span className="text-accent">.space</span>
            </span>
          </div>

          <div className="w-10 h-1 bg-accent mb-4" />

          <h2 className="text-2xl font-extrabold text-ink tracking-normal">Вход в кабинет</h2>
          <p className="text-muted text-sm mt-1 mb-8">Логин платформа выдала вам при регистрации</p>

          <form className="space-y-4" onSubmit={submit}>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <Input
              value={login}
              onChange={setLogin}
              label="Логин"
              placeholder="ivanova.m"
              icon="user"
              autoComplete="username"
            />
            <Input
              value={password}
              onChange={setPassword}
              label="Пароль"
              type="password"
              placeholder="••••••••"
              icon="lock"
              autoComplete="current-password"
            />
            <Button type="submit" block size="lg" loading={busy} iconRight="arrowRight">
              Войти
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-line flex items-center justify-between gap-3">
            <span className="text-xs text-muted">Ещё нет учётной записи?</span>
            <Link href="/register" className="text-xs text-accent hover:underline">
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
