'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Icon, Input, PageHeader, Select, Table } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { ACCENTS, useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { SUBJECTS } from '@/lib/catalog';
import type { Profile } from '@/lib/types';

interface SessionRow {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip: string;
  userAgent: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { profile, apply, logout } = useAuth();
  const { theme, setTheme, accent, setAccent } = useTheme();

  const [fullName, setFullName] = useState('');
  const [subject, setSubject] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setSubject(profile.subject);
    }
  }, [profile]);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await api.get<SessionRow[]>('/auth/sessions'));
    } catch {
      /* список сессий не критичен */
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function saveProfile() {
    setBusy(true);
    try {
      const updated = await api.patch<Profile>('/auth/me', { fullName, subject });
      apply(updated);
      notify.toast('Профиль сохранён');
    } catch (e) {
      notify.error('Не удалось сохранить', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      notify.warning('Новый пароль должен быть не короче 8 символов');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      notify.success('Пароль изменён');
    } catch (e) {
      notify.error('Не удалось сменить пароль', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await api.del(`/auth/sessions/${id}`);
      await loadSessions();
      notify.toast('Сессия завершена');
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    }
  }

  async function revokeOthers() {
    try {
      const result = await api.del<{ revoked: number }>('/auth/sessions');
      await loadSessions();
      notify.success('Готово', { text: `Завершено сессий: ${result.revoked}` });
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    }
  }

  async function doLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <PageHeader title="Настройки" subtitle="Профиль, оформление и вход в систему" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Профиль" subtitle={profile ? `Логин: ${profile.login}` : ''}>
          <div className="space-y-4">
            <Input value={fullName} onChange={setFullName} label="Фамилия и имя" />
            <Select
              value={subject}
              onChange={setSubject}
              label="Предмет"
              options={SUBJECTS}
              placeholder="Не указан"
              allowEmpty
            />
            <Button icon="save" loading={busy} onClick={saveProfile}>
              Сохранить
            </Button>
          </div>
        </Card>

        <Card title="Оформление" subtitle="Тема и акцентный цвет — только для вас">
          <div className="space-y-5">
            <div>
              <span className="ng-label text-muted block mb-2">Тема</span>
              <div className="flex gap-2">
                {[
                  { value: 'dark', label: 'Тёмная', icon: 'moon' },
                  { value: 'light', label: 'Светлая', icon: 'sun' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTheme(item.value)}
                    className={`flex items-center gap-2 px-4 h-10 border text-sm font-semibold transition-colors cursor-pointer ${
                      theme === item.value
                        ? 'bg-accent border-accent text-on-accent'
                        : 'bg-surface-2 border-line text-muted hover:text-ink'
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="ng-label text-muted block mb-2">Акцент</span>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    onClick={() => setAccent(item.id)}
                    className={`w-10 h-10 border-2 transition-transform cursor-pointer ${
                      accent === item.id ? 'border-ink scale-105' : 'border-transparent'
                    }`}
                    style={{ background: item.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Пароль" subtitle="Меняйте, если пароль стал известен кому-то ещё">
          <div className="space-y-4">
            <Input
              value={currentPassword}
              onChange={setCurrentPassword}
              label="Текущий пароль"
              type="password"
              autoComplete="current-password"
            />
            <Input
              value={newPassword}
              onChange={setNewPassword}
              label="Новый пароль"
              type="password"
              hint="Не короче 8 символов"
              autoComplete="new-password"
            />
            <Button icon="key" loading={busy} onClick={changePassword}>
              Сменить пароль
            </Button>
          </div>
        </Card>

        <Card
          title="Сессии"
          subtitle="Устройства, с которых открыт кабинет"
          padding={false}
          actions={
            <Button size="sm" variant="ghost" icon="slash" onClick={revokeOthers}>
              Завершить остальные
            </Button>
          }
        >
          <Table
            columns={[
              { key: 'device', label: 'Устройство' },
              { key: 'seen', label: 'Активность', align: 'right' },
              { key: 'action', label: '', align: 'right', width: '60px' },
            ]}
            rows={sessions}
            rowKey={(row) => row.id}
            className="border-0"
            empty="Активных сессий нет"
            row={(row) => (
              <>
                <td className="px-4 py-3 align-middle">
                  <div className="text-sm text-ink truncate max-w-[240px]">
                    {row.userAgent || 'Неизвестное устройство'}
                  </div>
                  <div className="text-xs text-faint">
                    {row.ip}
                    {row.current ? ' · текущая' : ''}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right text-xs text-muted">
                  {formatRelative(row.lastSeenAt)}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {row.current ? (
                    <Badge variant="accent">эта</Badge>
                  ) : (
                    <button
                      type="button"
                      title="Завершить"
                      onClick={() => void revoke(row.id)}
                      className="h-8 w-8 flex items-center justify-center text-muted hover:text-danger cursor-pointer"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </td>
              </>
            )}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Button variant="danger" icon="logout" onClick={doLogout}>
          Выйти из системы
        </Button>
      </div>
    </>
  );
}
