'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@/lib/ui';
import { api, errorMessage, qs } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDate } from '@/lib/format';
import { SCHOOL_STATUS_LABELS, SCHOOL_STATUS_TONES } from '@/lib/catalog';
import type { PlatformSchoolRow, SchoolCredentials } from '@/lib/types';

export default function PlatformSchoolsPage() {
  const [rows, setRows] = useState<PlatformSchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    adminLastName: '',
    adminFirstName: '',
    contactEmail: '',
    months: '12',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<SchoolCredentials | null>(null);

  const filters = useMemo(() => qs({ status, search }), [status, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get<PlatformSchoolRow[]>(`/platform/schools${filters}`));
    } catch (e) {
      notify.error('Не удалось загрузить школы', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createSchool() {
    if (!form.name.trim() || !form.adminLastName.trim() || !form.adminFirstName.trim()) {
      notify.warning('Заполните название школы и имя администратора');
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<SchoolCredentials>('/platform/schools', {
        name: form.name.trim(),
        city: form.city.trim(),
        adminLastName: form.adminLastName.trim(),
        adminFirstName: form.adminFirstName.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
        months: Number(form.months) || 12,
        note: form.note.trim() || undefined,
      });
      setCreated(result);
      setOpen(false);
      setForm({ name: '', city: '', adminLastName: '', adminFirstName: '', contactEmail: '', months: '12', note: '' });
      await load();
    } catch (e) {
      notify.error('Не удалось завести школу', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function extend(row: PlatformSchoolRow) {
    const months = await notify.prompt({
      title: `Продлить «${row.name}»`,
      text: 'На сколько месяцев продлить доступ без оплаты?',
      inputValue: '12',
      inputType: 'number',
      confirmText: 'Продлить',
    });
    if (!months) {
      return;
    }
    try {
      await api.post(`/platform/schools/${row.id}/extend`, { months: Number(months) });
      await load();
      notify.toast('Доступ продлён');
    } catch (e) {
      notify.error('Не удалось продлить', { text: errorMessage(e) });
    }
  }

  async function toggleBlock(row: PlatformSchoolRow) {
    const blocking = row.status !== 'BLOCKED';
    const ok = await notify.confirm({
      title: blocking ? `Закрыть доступ «${row.name}»?` : `Открыть доступ «${row.name}»?`,
      text: blocking
        ? 'Сотрудники школы выйдут из системы. Данные останутся на месте.'
        : 'Школа снова сможет работать, если её срок не вышел.',
      confirmText: blocking ? 'Закрыть' : 'Открыть',
      danger: blocking,
    });
    if (!ok) {
      return;
    }
    try {
      await api.post(`/platform/schools/${row.id}/${blocking ? 'block' : 'unblock'}`, {});
      await load();
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    }
  }

  async function resetAdmin(row: PlatformSchoolRow) {
    const ok = await notify.confirm({
      title: `Сбросить пароль директора «${row.name}»?`,
      text: 'Пригодится, когда доступ потерян. Выданный пароль покажем один раз.',
      confirmText: 'Сбросить',
      icon: 'question',
    });
    if (!ok) {
      return;
    }
    try {
      const result = await api.post<{ login: string; temporaryPassword: string }>(
        `/platform/schools/${row.id}/admin-password`,
        {},
      );
      setCreated({
        schoolId: row.id,
        schoolName: row.name,
        login: result.login,
        temporaryPassword: result.temporaryPassword,
        paidUntil: row.paidUntil,
        trialDays: 0,
      });
    } catch (e) {
      notify.error('Не удалось сбросить пароль', { text: errorMessage(e) });
    }
  }

  async function remove(row: PlatformSchoolRow) {
    const ok = await notify.confirm({
      title: `Удалить «${row.name}»?`,
      text: 'Школа исчезнет из списка, её сотрудники потеряют доступ. Данные останутся в базе.',
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      await api.del(`/platform/schools/${row.id}`);
      await load();
      notify.toast('Школа удалена');
    } catch (e) {
      notify.error('Не удалось удалить', { text: errorMessage(e) });
    }
  }

  return (
    <>
      <PageHeader
        title="Школы"
        subtitle="Все школы платформы, их сроки и объём"
        actions={
          <>
            <Button variant="secondary" icon="refresh" onClick={load} loading={loading}>
              Обновить
            </Button>
            <Button icon="plus" onClick={() => setOpen(true)}>
              Завести школу
            </Button>
          </>
        }
      />

      {created ? (
        <Alert variant="success" title={`Доступ: ${created.schoolName}`} className="mb-6">
          <p>
            Логин <b className="text-ink">{created.login}</b>, временный пароль{' '}
            <b className="text-ink">{created.temporaryPassword}</b>. Передайте директору — при первом
            входе платформа попросит сменить пароль и подключить второй фактор.
          </p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreated(null)}>
            Скрыть
          </Button>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Select
          value={status}
          onChange={setStatus}
          label="Состояние"
          options={Object.entries(SCHOOL_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          placeholder="Любое"
          allowEmpty
        />
        <Input
          value={search}
          onChange={setSearch}
          label="Поиск"
          icon="search"
          placeholder="Название, город или почта"
          className="sm:col-span-2"
        />
      </div>

      {!loading && !rows.length ? (
        <Card padding={false}>
          <EmptyState
            icon="school"
            title="Школ пока нет"
            description="Заведите первую вручную или дождитесь регистрации с сайта."
            actions={
              <Button icon="plus" onClick={() => setOpen(true)}>
                Завести школу
              </Button>
            }
          />
        </Card>
      ) : (
        <Table
          columns={[
            { key: 'school', label: 'Школа' },
            { key: 'status', label: 'Состояние', width: '180px' },
            { key: 'until', label: 'Доступ до', width: '150px' },
            { key: 'size', label: 'Объём', align: 'right', hideOnMobile: true, width: '160px' },
            { key: 'actions', label: '', align: 'right', width: '60px' },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
          row={(row) => (
            <>
              <td className="px-4 py-3 align-middle">
                <div className="font-semibold text-ink">{row.name}</div>
                <div className="text-xs text-faint">
                  {row.city || 'город не указан'}
                  {row.contactEmail ? ` · ${row.contactEmail}` : ''}
                  {row.note ? ` · ${row.note}` : ''}
                </div>
              </td>
              <td className="px-4 py-3 align-middle">
                <Badge variant={SCHOOL_STATUS_TONES[row.status]} dot>
                  {SCHOOL_STATUS_LABELS[row.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 align-middle">
                <div className="text-sm text-ink">{formatDate(row.paidUntil)}</div>
                <div className="text-xs text-faint">
                  {row.daysLeft >= 0 ? `${row.daysLeft} дн.` : `просрочено ${-row.daysLeft} дн.`}
                </div>
              </td>
              <td className="px-4 py-3 align-middle text-right text-xs text-muted hidden md:table-cell">
                {row.counts.accounts} сотр. · {row.counts.classes} кл.
                <div className="text-faint">{row.counts.assignments} назначений</div>
              </td>
              <td className="px-4 py-3 align-middle text-right">
                <Dropdown align="right" width={240}>
                  {(close) => (
                    <>
                      <DropdownItem
                        icon="calendar"
                        onClick={() => {
                          close();
                          void extend(row);
                        }}
                      >
                        Продлить без оплаты
                      </DropdownItem>
                      <DropdownItem
                        icon="key"
                        onClick={() => {
                          close();
                          void resetAdmin(row);
                        }}
                      >
                        Сбросить пароль директора
                      </DropdownItem>
                      <DropdownItem
                        icon={row.status === 'BLOCKED' ? 'unlock' : 'lock'}
                        onClick={() => {
                          close();
                          void toggleBlock(row);
                        }}
                      >
                        {row.status === 'BLOCKED' ? 'Открыть доступ' : 'Закрыть доступ'}
                      </DropdownItem>
                      <div className="my-1 border-t border-line" />
                      <DropdownItem
                        icon="trash"
                        danger
                        onClick={() => {
                          close();
                          void remove(row);
                        }}
                      >
                        Удалить школу
                      </DropdownItem>
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
        title="Новая школа"
        subtitle="Заводится без оплаты — доступ откроется сразу"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button icon="check" loading={busy} onClick={createSchool}>
              Завести
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input value={form.name} onChange={(v) => set('name', v)} label="Название школы" placeholder="МБОУ СОШ № 12" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input value={form.city} onChange={(v) => set('city', v)} label="Город" placeholder="Пенза" />
            <Input
              value={form.contactEmail}
              onChange={(v) => set('contactEmail', v)}
              label="Почта школы"
              type="email"
              placeholder="school@mail.ru"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              value={form.adminLastName}
              onChange={(v) => set('adminLastName', v)}
              label="Фамилия директора"
              placeholder="Наземнова"
              required
            />
            <Input
              value={form.adminFirstName}
              onChange={(v) => set('adminFirstName', v)}
              label="Имя"
              placeholder="Наталья"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              value={form.months}
              onChange={(v) => set('months', v)}
              label="Месяцев доступа"
              type="number"
              min={1}
              max={60}
            />
            <Input value={form.note} onChange={(v) => set('note', v)} label="Пометка" placeholder="Пилот, договор №…" />
          </div>
        </div>
      </Modal>
    </>
  );
}
