'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Icon, Input, Select } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { SUBJECTS } from '@/lib/catalog';
import type { Profile } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const { apply } = useAuth();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [subject, setSubject] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!lastName.trim() || !firstName.trim()) {
      setError('Укажите фамилию и имя');
      return;
    }
    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов');
      return;
    }
    if (password !== repeat) {
      setError('Пароли не совпадают');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await api.post<{ login: string; profile: Profile }>('/auth/register', {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        subject: subject.trim(),
        password,
      });
      apply(res.profile);
      // Логин генерируется платформой — показываем его крупно и один раз.
      await notify.secrets(
        'Учётная запись создана',
        `<p style="margin-bottom:12px">Ваш логин для входа:</p>
         <p style="font-size:28px;font-weight:800;letter-spacing:0.04em">${res.login}</p>
         <p style="margin-top:12px;font-size:13px">Запишите его: входить в платформу нужно по логину, а не по фамилии.</p>`,
      );
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
            Школьная
            <br />
            платформа
            <br />
            тестирования
          </h1>
          <p className="mt-4 max-w-sm text-on-accent/80 text-sm leading-relaxed">
            Регистрация свободная: платформа стоит внутри школы. Логин соберётся сам, останется
            придумать пароль.
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

          <h2 className="text-2xl font-extrabold text-ink tracking-normal">Регистрация</h2>
          <p className="text-muted text-sm mt-1 mb-8">Фамилия и имя нужны для подписи работ и бланков</p>

          <form className="space-y-4" onSubmit={submit}>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <Input value={lastName} onChange={setLastName} label="Фамилия" placeholder="Наземнова" icon="user" required />
            <Input value={firstName} onChange={setFirstName} label="Имя" placeholder="Наталья" icon="user" required />
            <Select
              value={subject}
              onChange={setSubject}
              label="Предмет"
              options={SUBJECTS}
              placeholder="Не указывать"
              allowEmpty
              hint="Виден коллегам, когда вы делитесь тестом"
            />
            <Input
              value={password}
              onChange={setPassword}
              label="Пароль"
              type="password"
              placeholder="Не короче 8 символов"
              icon="lock"
              autoComplete="new-password"
              required
            />
            <Input
              value={repeat}
              onChange={setRepeat}
              label="Пароль ещё раз"
              type="password"
              placeholder="••••••••"
              icon="lock"
              autoComplete="new-password"
              required
            />
            <Button type="submit" block size="lg" loading={busy} iconRight="arrowRight">
              Создать кабинет
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-line flex items-center justify-between gap-3">
            <span className="text-xs text-muted">Уже зарегистрированы?</span>
            <Link href="/login" className="text-xs text-accent hover:underline">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
