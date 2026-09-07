'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Button, Card, Icon, Input } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { homeFor } from '@/lib/routes';
import type { Profile } from '@/lib/types';

/**
 * Первый вход. Два обязательных шага: сменить временный пароль и — для
 * администраторов — подключить второй фактор. Пока они не пройдены, данные
 * школы платформа не отдаёт, поэтому и показывать тут больше нечего.
 */
export default function SetupPage() {
  const router = useRouter();
  const { profile, ready, apply, logout } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (profile.setupStep === 'done' && !backupCodes.length) {
      router.replace(homeFor(profile));
    }
  }, [ready, profile, router, backupCodes.length]);

  const startTotp = useCallback(async () => {
    try {
      const res = await api.post<{ secret: string; otpauthUrl: string }>('/auth/totp/setup', {});
      setSecret(res.secret);
      setOtpauth(res.otpauthUrl);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (profile?.setupStep === 'totp' && !secret) {
      void startTotp();
    }
  }, [profile?.setupStep, secret, startTotp]);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (next.length < 10) {
      setError('Новый пароль должен быть не короче 10 символов');
      return;
    }
    if (next !== repeat) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await api.post<Profile>('/auth/password', {
        currentPassword: current,
        newPassword: next,
      });
      apply(updated);
      setCurrent('');
      setNext('');
      setRepeat('');
      notify.toast('Пароль изменён');
      if (updated.setupStep === 'done') {
        router.replace(homeFor(updated));
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{ backupCodes: string[] }>('/auth/totp/confirm', {
        code: code.trim(),
      });
      setBackupCodes(res.backupCodes);
      const updated = await api.get<Profile>('/auth/me');
      apply(updated);
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-10 h-1 bg-accent animate-pulse" />
      </div>
    );
  }

  const step = profile.setupStep;

  return (
    <div className="min-h-screen bg-bg px-4 sm:px-6 py-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2.5 mb-8">
          <span className="w-8 h-8 bg-accent text-on-accent flex items-center justify-center">
            <Icon name="graduation" size={17} />
          </span>
          <span className="font-extrabold text-ink">
            edway<span className="text-accent">.space</span>
          </span>
          <div className="flex-1" />
          <Button variant="ghost" icon="logout" onClick={() => void logout().then(() => router.replace('/login'))}>
            Выйти
          </Button>
        </div>

        <div className="w-10 h-1 bg-accent mb-4" />
        <h1 className="text-2xl font-extrabold text-ink tracking-normal">Настройка входа</h1>
        <p className="text-muted text-sm mt-1 mb-6">
          {profile.fullName}
          {profile.school ? ` · ${profile.school.name}` : ' · администратор платформы'}
        </p>

        <div className="flex items-center gap-2 mb-8">
          <Badge variant={step === 'password' ? 'accent' : 'success'} dot>
            1. Пароль
          </Badge>
          <Badge variant={step === 'totp' ? 'accent' : step === 'done' ? 'success' : 'neutral'} dot>
            2. Второй фактор
          </Badge>
        </div>

        {backupCodes.length ? (
          <Card title="Резервные коды" subtitle="Понадобятся, если телефон окажется недоступен" accent>
            <Alert variant="warning" className="mb-4">
              Запишите их сейчас: коды показываются один раз, каждый срабатывает однократно.
            </Alert>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm text-ink">
              {backupCodes.map((codeItem) => (
                <div key={codeItem} className="border border-line bg-surface-2 px-3 py-2 text-center">
                  {codeItem}
                </div>
              ))}
            </div>
            <Button
              className="mt-5"
              block
              iconRight="arrowRight"
              onClick={() => router.replace(homeFor(profile))}
            >
              Записал, перейти в кабинет
            </Button>
          </Card>
        ) : step === 'password' ? (
          <Card title="Смените временный пароль" subtitle="Тот, что выдали при создании учётной записи">
            <form className="space-y-4" onSubmit={changePassword}>
              {error ? <Alert variant="danger">{error}</Alert> : null}
              <Input
                value={current}
                onChange={setCurrent}
                label="Временный пароль"
                type="password"
                autoComplete="current-password"
                autoFocus
              />
              <Input
                value={next}
                onChange={setNext}
                label="Новый пароль"
                type="password"
                hint="Не короче 10 символов"
                autoComplete="new-password"
              />
              <Input
                value={repeat}
                onChange={setRepeat}
                label="Новый пароль ещё раз"
                type="password"
                autoComplete="new-password"
              />
              <Button type="submit" block size="lg" loading={busy} iconRight="arrowRight">
                Сменить пароль
              </Button>
            </form>
          </Card>
        ) : (
          <Card
            title="Подключите второй фактор"
            subtitle="Google Authenticator, Яндекс.Ключ, Aegis — подойдёт любое приложение"
          >
            <ol className="text-sm text-muted space-y-2 list-decimal pl-4 mb-5">
              <li>Откройте приложение-аутентификатор и добавьте новую учётную запись.</li>
              <li>Введите ключ вручную — сканировать здесь нечего.</li>
              <li>Впишите шестизначный код, который появится в приложении.</li>
            </ol>

            <div className="border border-line bg-surface-2 px-4 py-3 mb-5">
              <div className="ng-label text-muted mb-1">Ключ</div>
              <div className="font-mono text-lg text-ink break-all">{secret || '…'}</div>
              {otpauth ? (
                <div className="text-[11px] text-faint mt-2 break-all">{otpauth}</div>
              ) : null}
            </div>

            <form className="space-y-4" onSubmit={confirmTotp}>
              {error ? <Alert variant="danger">{error}</Alert> : null}
              <Input
                value={code}
                onChange={setCode}
                label="Код из приложения"
                placeholder="000000"
                icon="shield"
                inputMode="numeric"
                autoFocus
              />
              <Button type="submit" block size="lg" loading={busy} iconRight="arrowRight">
                Подтвердить
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
