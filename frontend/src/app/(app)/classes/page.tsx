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
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Textarea,
} from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { CLASS_LETTERS, CLASS_NUMBERS } from '@/lib/catalog';
import { countLabel } from '@/lib/format';
import type { ClassDetail, SchoolClass } from '@/lib/types';

export default function ClassesPage() {
  const [rows, setRows] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [letter, setLetter] = useState('');
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [listText, setListText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get<SchoolClass[]>('/classes'));
    } catch (e) {
      notify.error('Не удалось загрузить классы', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createClass() {
    if (!number || !letter) {
      notify.warning('Выберите номер и букву класса');
      return;
    }
    setSaving(true);
    try {
      await api.post('/classes', { number: Number(number), letter });
      setCreateOpen(false);
      setNumber('');
      setLetter('');
      await load();
      notify.toast('Класс создан');
    } catch (e) {
      notify.error('Не удалось создать класс', { text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(id: string) {
    try {
      const data = await api.get<ClassDetail>(`/classes/${id}`);
      setDetail(data);
      setListText(data.students.map((student) => `${student.lastName} ${student.firstName}`).join('\n'));
    } catch (e) {
      notify.error('Не удалось открыть класс', { text: errorMessage(e) });
    }
  }

  /**
   * Список вставляют колонкой из журнала: по строке на ученика,
   * «Фамилия Имя». Разбираем всё, что похоже на пару слов.
   */
  async function saveStudents() {
    if (!detail) {
      return;
    }
    const students = listText
      .split('\n')
      .map((line) => line.trim().replace(/^\d+[.)]?\s*/, ''))
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\s+/);
        return { lastName: parts[0] ?? '', firstName: parts[1] ?? '' };
      })
      .filter((student) => student.lastName && student.firstName);

    if (!students.length) {
      notify.warning('Не удалось разобрать ни одной строки', {
        text: 'В каждой строке должны быть фамилия и имя через пробел.',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await api.post<{ added: number; archived: number; total: number }>(
        `/classes/${detail.id}/students`,
        { students },
      );
      await openDetail(detail.id);
      await load();
      notify.success('Список сохранён', {
        text: `Всего ${result.total}, добавлено ${result.added}, убрано ${result.archived}.`,
      });
    } catch (e) {
      notify.error('Не удалось сохранить список', { text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  async function promote(row: SchoolClass) {
    const ok = await notify.confirm({
      title: `Перевести ${row.name} в ${row.number + 1}${row.letter}?`,
      text: 'Ученики переедут в новый класс, а прошлые работы останутся за старым.',
      confirmText: 'Перевести',
      icon: 'question',
    });
    if (!ok) {
      return;
    }
    try {
      await api.post(`/classes/${row.id}/promote`, {});
      await load();
      notify.toast('Класс переведён');
    } catch (e) {
      notify.error('Не удалось перевести', { text: errorMessage(e) });
    }
  }

  async function promoteAll() {
    const ok = await notify.confirm({
      title: 'Перевести всю школу на следующий год?',
      text: 'Параллели поднимутся на класс выше, одиннадцатые уйдут в архив.',
      confirmText: 'Перевести',
      icon: 'question',
    });
    if (!ok) {
      return;
    }
    try {
      const result = await api.post<{ promoted: number; graduated: number }>('/classes/promote-all', {});
      await load();
      notify.success('Готово', {
        text: `Переведено классов: ${result.promoted}, выпущено: ${result.graduated}.`,
      });
    } catch (e) {
      notify.error('Не удалось перевести', { text: errorMessage(e) });
    }
  }

  async function remove(row: SchoolClass) {
    const ok = await notify.confirm({
      title: `Удалить ${row.name}?`,
      text: row.assignmentCount
        ? 'По классу есть назначения — он уйдёт в архив вместе с историей.'
        : 'Класс и список учеников будут удалены.',
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      await api.del(`/classes/${row.id}`);
      await load();
      notify.toast('Класс удалён');
    } catch (e) {
      notify.error('Не удалось удалить', { text: errorMessage(e) });
    }
  }

  return (
    <>
      <PageHeader
        title="Классы"
        subtitle="Списки нужны, чтобы бланк печатался сразу с фамилией ученика"
        actions={
          <>
            <Button variant="secondary" icon="arrowUpRight" onClick={promoteAll}>
              Новый учебный год
            </Button>
            <Button icon="plus" onClick={() => setCreateOpen(true)}>
              Создать класс
            </Button>
          </>
        }
      />

      {!loading && !rows.length ? (
        <Card padding={false}>
          <EmptyState
            icon="grid"
            title="Классов пока нет"
            description="Заведите класс и вставьте список учеников — дальше можно назначать тесты."
            actions={
              <Button icon="plus" onClick={() => setCreateOpen(true)}>
                Создать класс
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row) => (
            <article key={row.id} className="bg-surface border border-line hover:border-line-strong transition-colors">
              <div className="p-5 flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void openDetail(row.id)}
                  className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                >
                  <span className="w-12 h-12 bg-accent text-on-accent flex items-center justify-center text-lg font-extrabold shrink-0">
                    {row.name}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">
                      {countLabel(row.studentCount, 'ученик', 'ученика', 'учеников')}
                    </span>
                    <span className="block text-xs text-muted mt-0.5">
                      {countLabel(row.assignmentCount, 'назначение', 'назначения', 'назначений')}
                    </span>
                  </span>
                </button>

                <Dropdown align="right" width={220}>
                  {(close) => (
                    <>
                      <DropdownItem
                        icon="users"
                        onClick={() => {
                          close();
                          void openDetail(row.id);
                        }}
                      >
                        Список учеников
                      </DropdownItem>
                      <DropdownItem
                        icon="arrowUpRight"
                        onClick={() => {
                          close();
                          void promote(row);
                        }}
                      >
                        Перевести в {row.number + 1}
                        {row.letter}
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
                        Удалить
                      </DropdownItem>
                    </>
                  )}
                </Dropdown>
              </div>

              {row.studentCount === 0 ? (
                <div className="px-5 pb-4">
                  <Badge variant="warning" dot>
                    Список не заполнен
                  </Badge>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новый класс"
        subtitle="Номер и буква — как в журнале"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button icon="check" loading={saving} onClick={createClass}>
              Создать
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            value={number}
            onChange={setNumber}
            label="Номер"
            options={CLASS_NUMBERS.map((value) => ({ value, label: String(value) }))}
            placeholder="Класс"
          />
          <Select
            value={letter}
            onChange={setLetter}
            label="Буква"
            options={CLASS_LETTERS}
            placeholder="Буква"
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `Класс ${detail.name}` : ''}
        subtitle="Вставьте список из журнала: по строке на ученика"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Закрыть
            </Button>
            <Button icon="save" loading={saving} onClick={saveStudents}>
              Сохранить список
            </Button>
          </>
        }
      >
        <Alert variant="info" className="mb-4">
          Ученики, которых нет в новом списке, уходят в архив — их прошлые работы и оценки остаются
          в журнале.
        </Alert>
        <Textarea
          value={listText}
          onChange={setListText}
          rows={14}
          placeholder={'Иванов Пётр\nПетрова Мария\nСидоров Иван'}
          hint="Нумерация в начале строки не мешает — она отбрасывается"
        />
      </Modal>
    </>
  );
}
