'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Tile,
} from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDate, formatRelative } from '@/lib/format';
import { ROLE_LABELS, SUBJECTS } from '@/lib/catalog';
import { useAuth } from '@/lib/auth';
import type { SchoolDetail, StaffRow } from '@/lib/types';

export default function SchoolPage() {
  const { profile } = useAuth();
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [subject, setSubject] = useState('');
  const [role, setRole] = useState('TEACHER');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ login: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, list] = await Promise.all([
        api.get<SchoolDetail>('/schools/mine'),
        api.get<StaffRow[]>('/accounts'),
      ]);
      setSchool(detail);
      setStaff(list);
    } catch (e) {
      notify.error('Не удалось загрузить школу', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createStaff() {
    if (!lastName.trim() || !firstName.trim()) {
      notify.warning('Укажите фамилию и имя');
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<{ account: StaffRow; temporaryPassword: string }>('/accounts', {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        subject: subject.trim(),
        role,
      });
      setCreated({ login: result.account.login, password: result.temporaryPassword });
      setLastName('');
      setFirstName('');
      setSubject('');
      setRole('TEACHER');
      setOpen(false);
      await load();
    } catch (e) {
      notify.error('Не удалось создать учётную запись', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(row: StaffRow) {
    const ok = await notify.confirm({
      title: `Сбросить пароль: ${row.fullName}?`,
      text: 'Сотрудник выйдет из системы и войдёт по новому временному паролю.',
      confirmText: 'Сбросить',
      icon: 'question',
    });
    if (!ok) {
      return;
    }
    try {
      const result = await api.post<{ temporaryPassword: string }>(`/accounts/${row.id}/password`, {});
      setCreated({ login: row.login, password: result.temporaryPassword });
      await load();
    } catch (e) {
      notify.error('Не удалось сбросить пароль', { text: errorMessage(e) });
    }
  }

  async function resetTotp(row: StaffRow) {
    const ok = await notify.confirm({
      title: `Сбросить второй фактор: ${row.fullName}?`,
      text: 'Понадобится, если сотрудник потерял телефон. Он подключит приложение заново.',
      confirmText: 'Сбросить',
      icon: 'question',
    });
    if (!ok) {
      return;
    }
    try {
      await api.post(`/accounts/${row.id}/totp-reset`, {});
      await load();
      notify.toast('Второй фактор сброшен');
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    }
  }

  async function remove(row: StaffRow) {
    const ok = await notify.confirm({
      title: `Удалить ${row.fullName}?`,
      text: 'Учётная запись закроется, а созданные ею тесты и выставленные оценки останутся в школе.',
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      await api.del(`/accounts/${row.id}`);
      await load();
      notify.toast('Учётная запись закрыта');
    } catch (e) {
      notify.error('Не удалось удалить', { text: errorMessage(e) });
    }
  }

  return (
    <>
      <PageHeader
        title="Школа"
        subtitle={school?.name ?? 'Сотрудники и доступы'}
        actions={
          <>
            <Button variant="secondary" icon="refresh" onClick={load} loading={loading}>
              Обновить
            </Button>
            <Button icon="userPlus" onClick={() => setOpen(true)}>
              Добавить сотрудника
            </Button>
          </>
        }
      />

      {school ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Tile solid label="Сотрудников" value={school.counts.accounts} icon="users" hint="учителя и администраторы" />
          <Tile label="Классов" value={school.counts.classes} icon="grid" hint="в школе" />
          <Tile label="Тестов" value={school.counts.tests} icon="clipboard" hint="создано" />
          <Tile
            label="Доступ до"
            value={formatDate(school.paidUntil)}
            icon="calendar"
            hint={`осталось ${school.daysLeft} дн.`}
            href="/subscription"
          />
        </div>
      ) : null}

      {created ? (
        <Alert variant="success" title="Доступы созданы" className="mb-6">
          <p>
            Логин <b className="text-ink">{created.login}</b>, временный пароль{' '}
            <b className="text-ink">{created.password}</b>. Передайте их сотруднику — пароль
            показывается один раз, при первом входе платформа попросит его сменить.
          </p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreated(null)}>
            Скрыть
          </Button>
        </Alert>
      ) : null}

      {!loading && !staff.length ? (
        <Card padding={false}>
          <EmptyState
            icon="users"
            title="Сотрудников пока нет"
            description="Заведите учителей — каждый получит свой логин и временный пароль."
            actions={
              <Button icon="userPlus" onClick={() => setOpen(true)}>
                Добавить сотрудника
              </Button>
            }
          />
        </Card>
      ) : (
        <Table
          columns={[
            { key: 'name', label: 'Сотрудник' },
            { key: 'login', label: 'Логин', hideOnMobile: true, width: '160px' },
            { key: 'role', label: 'Роль', width: '180px' },
            { key: 'state', label: 'Состояние', width: '190px' },
            { key: 'actions', label: '', align: 'right', width: '60px' },
          ]}
          rows={staff}
          rowKey={(row) => row.id}
          row={(row) => (
            <>
              <td className="px-4 py-3 align-middle">
                <div className="font-semibold text-ink">{row.fullName}</div>
                <div className="text-xs text-faint">
                  {row.subject || 'предмет не указан'}
                  {row.lastSeenAt ? ` · был ${formatRelative(row.lastSeenAt)}` : ''}
                </div>
              </td>
              <td className="px-4 py-3 align-middle hidden md:table-cell">
                <code className="text-xs text-muted">{row.login}</code>
              </td>
              <td className="px-4 py-3 align-middle">
                <Badge variant={row.role === 'SCHOOL_ADMIN' ? 'accent' : 'neutral'}>
                  {ROLE_LABELS[row.role]}
                </Badge>
              </td>
              <td className="px-4 py-3 align-middle">
                <div className="flex flex-wrap gap-1.5">
                  {row.mustChangePassword ? (
                    <Badge variant="warning">пароль не сменён</Badge>
                  ) : (
                    <Badge variant="success" dot>
                      работает
                    </Badge>
                  )}
                  {row.totpEnabled ? <Badge variant="info">2ФА</Badge> : null}
                </div>
              </td>
              <td className="px-4 py-3 align-middle text-right">
                <Dropdown align="right" width={230}>
                  {(close) => (
                    <>
                      <DropdownItem
                        icon="key"
                        onClick={() => {
                          close();
                          void resetPassword(row);
                        }}
                      >
                        Сбросить пароль
                      </DropdownItem>
                      {row.totpEnabled ? (
                        <DropdownItem
                          icon="shield"
                          onClick={() => {
                            close();
                            void resetTotp(row);
                          }}
                        >
                          Сбросить второй фактор
                        </DropdownItem>
                      ) : null}
                      {row.id !== profile?.id ? (
                        <>
                          <div className="my-1 border-t border-line" />
                          <DropdownItem
                            icon="trash"
                            danger
                            onClick={() => {
                              close();
                              void remove(row);
                            }}
                          >
                            Удалить
                          </DropdownItem>
                        </>
                      ) : null}
                    </>
                  )}
                </Dropdown>
              </td>
            </>
          )}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новый сотрудник"
        subtitle="Логин соберётся сам, пароль выдадим временный"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button icon="check" loading={busy} onClick={createStaff}>
              Создать
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input value={lastName} onChange={setLastName} label="Фамилия" placeholder="Иванов" required />
            <Input value={firstName} onChange={setFirstName} label="Имя" placeholder="Сергей" required />
          </div>
          <Select
            value={subject}
            onChange={setSubject}
            label="Предмет"
            options={SUBJECTS}
            placeholder="Не указывать"
            allowEmpty
          />
          <Select
            value={role}
            onChange={setRole}
            label="Роль"
            options={[
              { value: 'TEACHER', label: 'Учитель' },
              { value: 'SCHOOL_ADMIN', label: 'Администратор школы' },
            ]}
            hint="Администратор заводит сотрудников и платит за подписку"
          />
        </div>
      </Modal>
    </>
  );
}
