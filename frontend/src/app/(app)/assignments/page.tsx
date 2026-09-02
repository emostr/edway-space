'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  DateInput,
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
import type { AssignmentRow, SchoolClass, TestSummary } from '@/lib/types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function AssignmentsView() {
  const router = useRouter();
  const search = useSearchParams();
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterTest, setFilterTest] = useState('');

  const [open, setOpen] = useState(false);
  const [testId, setTestId] = useState('');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [spare, setSpare] = useState('2');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, classList, testList] = await Promise.all([
        api.get<AssignmentRow[]>(`/assignments${qs({ classId: filterClass, testId: filterTest })}`),
        api.get<SchoolClass[]>('/classes'),
        api.get<TestSummary[]>('/tests'),
      ]);
      setRows(list);
      setClasses(classList);
      setTests(testList);
    } catch (e) {
      notify.error('Не удалось загрузить назначения', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterTest]);

  useEffect(() => {
    void load();
  }, [load]);

  // Со страницы теста приходят с уже выбранным тестом — сразу открываем форму.
  useEffect(() => {
    const preset = search.get('testId');
    if (preset) {
      setTestId(preset);
      setOpen(true);
    }
  }, [search]);

  async function create() {
    if (!testId || !classId || !date) {
      notify.warning('Выберите тест, класс и дату');
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<AssignmentRow>('/assignments', {
        testId,
        classId,
        date,
        note,
        spare: Number(spare) || 0,
      });
      setOpen(false);
      notify.success('Назначение создано', { text: 'Теперь можно распечатать бланки.' });
      router.push(`/assignments/${created.id}`);
    } catch (e) {
      notify.error('Не удалось назначить', { text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  const published = tests.filter((test) => test.isPublished);

  return (
    <>
      <PageHeader
        title="Назначения тестов"
        subtitle="Тест, класс и дата — платформа готовит бланки на весь список"
        actions={
          <Button
            icon="plus"
            onClick={() => {
              setOpen(true);
              setDate(today());
            }}
          >
            Назначить тест
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Select
          value={filterClass}
          onChange={setFilterClass}
          label="Класс"
          options={classes.map((item) => ({ value: item.id, label: item.name }))}
          placeholder="Все классы"
          allowEmpty
        />
        <Select
          value={filterTest}
          onChange={setFilterTest}
          label="Тест"
          options={tests.map((item) => ({ value: item.id, label: item.title }))}
          placeholder="Все тесты"
          allowEmpty
        />
      </div>

      {!loading && !rows.length ? (
        <Card padding={false}>
          <EmptyState
            icon="calendar"
            title="Назначений нет"
            description="Выберите опубликованный тест, класс и дату — платформа заведёт по бланку на каждого ученика."
            actions={
              <Button icon="plus" onClick={() => setOpen(true)}>
                Назначить тест
              </Button>
            }
          />
        </Card>
      ) : (
        <Table
          columns={[
            { key: 'date', label: 'Дата', width: '120px' },
            { key: 'class', label: 'Класс', width: '90px' },
            { key: 'test', label: 'Тест' },
            { key: 'progress', label: 'Проверено', align: 'right', width: '140px' },
            { key: 'status', label: '', align: 'right', width: '120px' },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
          row={(row) => (
            <>
              <td className="px-4 py-3 align-middle text-sm text-muted whitespace-nowrap">
                {formatDate(row.date)}
              </td>
              <td className="px-4 py-3 align-middle">
                <Badge variant="neutral">{row.className}</Badge>
              </td>
              <td className="px-4 py-3 align-middle">
                <a href={`/assignments/${row.id}`} className="font-semibold text-ink hover:text-accent">
                  {row.testTitle}
                </a>
                {row.note ? <div className="text-xs text-faint mt-0.5">{row.note}</div> : null}
              </td>
              <td className="px-4 py-3 align-middle text-right">
                <Badge variant={row.checked === row.total ? 'success' : row.checked ? 'warning' : 'neutral'}>
                  {row.checked} / {row.total}
                </Badge>
              </td>
              <td className="px-4 py-3 align-middle text-right">
                <Button size="sm" variant="ghost" iconRight="chevronRight" href={`/assignments/${row.id}`}>
                  Открыть
                </Button>
              </td>
            </>
          )}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Назначить тест"
        subtitle="Бланки заведутся на каждого ученика класса"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button icon="check" loading={saving} onClick={create}>
              Назначить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            value={testId}
            onChange={setTestId}
            label="Тест"
            options={published.map((test) => ({ value: test.id, label: test.title }))}
            placeholder={published.length ? 'Выберите тест…' : 'Нет опубликованных тестов'}
          />
          <Select
            value={classId}
            onChange={setClassId}
            label="Класс"
            options={classes.map((item) => ({
              value: item.id,
              label: `${item.name} · ${item.studentCount} чел.`,
              disabled: item.studentCount === 0,
            }))}
            placeholder="Выберите класс…"
            hint="Классы без списка учеников недоступны"
          />
          <DateInput value={date} onChange={setDate} label="Дата работы" />
          <Input
            type="number"
            min={0}
            max={10}
            value={spare}
            onChange={setSpare}
            label="Запасных бланков"
            hint="Пригодятся новеньким и вместо испорченного листа"
          />
          <Input value={note} onChange={setNote} label="Пометка" placeholder="Например: 2 урок, кабинет 12" />
        </div>
      </Modal>
    </>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<div className="w-10 h-1 bg-accent animate-pulse" />}>
      <AssignmentsView />
    </Suspense>
  );
}
