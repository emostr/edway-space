'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  DropdownItem,
  EmptyState,
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
  Tabs,
} from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import type { Colleague, TestDetail, TestSummary } from '@/lib/types';

export default function TestsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [rows, setRows] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [shareTest, setShareTest] = useState<TestDetail | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [shareTarget, setShareTarget] = useState('');
  const [shareEdit, setShareEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get<TestSummary[]>('/tests'));
    } catch (e) {
      notify.error('Не удалось загрузить тесты', { text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    let list = rows;
    if (tab === 'mine') {
      list = list.filter((row) => row.mine);
    } else if (tab === 'shared') {
      list = list.filter((row) => !row.mine);
    } else if (tab === 'drafts') {
      list = list.filter((row) => !row.isPublished);
    }
    const needle = search.trim().toLowerCase();
    return needle ? list.filter((row) => row.title.toLowerCase().includes(needle)) : list;
  }, [rows, tab, search]);

  async function duplicate(test: TestSummary) {
    try {
      const copy = await api.post<TestSummary>(`/tests/${test.id}/duplicate`, {});
      notify.toast('Копия создана');
      router.push(`/tests/${copy.id}/edit`);
    } catch (e) {
      notify.error('Не удалось скопировать', { text: errorMessage(e) });
    }
  }

  async function togglePublish(test: TestSummary) {
    try {
      await api.post(`/tests/${test.id}/${test.isPublished ? 'unpublish' : 'publish'}`);
      await load();
      notify.toast(test.isPublished ? 'Тест снят с публикации' : 'Тест опубликован');
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    }
  }

  async function remove(test: TestSummary) {
    const ok = await notify.confirm({
      title: `Удалить «${test.title}»?`,
      text: test.assignmentCount
        ? 'По тесту есть назначения — оценки в журнале останутся, но назначить его снова будет нельзя.'
        : 'Тест исчезнет из списка.',
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      await api.del(`/tests/${test.id}`);
      await load();
      notify.toast('Тест удалён');
    } catch (e) {
      notify.error('Не удалось удалить', { text: errorMessage(e) });
    }
  }

  async function openShare(test: TestSummary) {
    try {
      const [detail, list] = await Promise.all([
        api.get<TestDetail>(`/tests/${test.id}`),
        api.get<Colleague[]>('/auth/colleagues'),
      ]);
      setShareTest(detail);
      setColleagues(list);
      setShareTarget('');
      setShareEdit(false);
    } catch (e) {
      notify.error('Не удалось открыть доступ', { text: errorMessage(e) });
    }
  }

  async function addShare() {
    if (!shareTest || !shareTarget) {
      notify.warning('Выберите коллегу из списка');
      return;
    }
    try {
      const updated = await api.post<TestDetail>(`/tests/${shareTest.id}/share`, {
        teacherId: shareTarget,
        canEdit: shareEdit,
      });
      setShareTest(updated);
      setShareTarget('');
      await load();
      notify.toast('Доступ открыт');
    } catch (e) {
      notify.error('Не удалось поделиться', { text: errorMessage(e) });
    }
  }

  async function revokeShare(teacherId: string) {
    if (!shareTest) {
      return;
    }
    try {
      const updated = await api.del<TestDetail>(`/tests/${shareTest.id}/share/${teacherId}`);
      setShareTest(updated);
      await load();
    } catch (e) {
      notify.error('Не удалось закрыть доступ', { text: errorMessage(e) });
    }
  }

  const free = colleagues.filter(
    (colleague) => !shareTest?.shares.some((share) => share.teacherId === colleague.id),
  );

  return (
    <>
      <PageHeader
        title="Тесты"
        subtitle="Ваши работы и то, чем поделились коллеги"
        actions={
          <Button icon="plus" href="/tests/new">
            Создать тест
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'Все', badge: rows.length },
          { value: 'mine', label: 'Мои', badge: rows.filter((row) => row.mine).length },
          { value: 'shared', label: 'Общие', badge: rows.filter((row) => !row.mine).length },
          { value: 'drafts', label: 'Черновики', badge: rows.filter((row) => !row.isPublished).length },
        ]}
        className="mb-4"
      />

      <Input
        value={search}
        onChange={setSearch}
        placeholder="Поиск по названию…"
        icon="search"
        className="mb-6 max-w-md"
      />

      {!loading && !visible.length ? (
        <Card padding={false}>
          <EmptyState
            icon="clipboard"
            title="Тестов нет"
            description="Соберите работу в конструкторе: задания с формулами и картинками, ключи проверки и шкала оценок."
            actions={
              <Button icon="plus" href="/tests/new">
                Создать тест
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((test) => (
            <article
              key={test.id}
              className={`bg-surface border border-line hover:border-line-strong transition-colors flex flex-col ${
                test.isPublished ? '' : 'border-dashed'
              }`}
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {!test.mine ? <Badge variant="info">от {test.ownerName.split(' ')[0]}</Badge> : null}
                    <Badge variant={test.isPublished ? 'success' : 'neutral'} dot>
                      {test.isPublished ? 'Опубликован' : 'Черновик'}
                    </Badge>
                    {test.sharedWith > 0 && test.mine ? (
                      <Badge variant="accent">общий · {test.sharedWith}</Badge>
                    ) : null}
                  </div>

                  <Dropdown align="right" width={240}>
                    {(close) => (
                      <>
                        <DropdownItem
                          icon="eye"
                          onClick={() => {
                            close();
                            router.push(`/tests/${test.id}`);
                          }}
                        >
                          Открыть
                        </DropdownItem>
                        {test.canEdit ? (
                          <DropdownItem
                            icon="edit"
                            onClick={() => {
                              close();
                              router.push(`/tests/${test.id}/edit`);
                            }}
                          >
                            Редактировать
                          </DropdownItem>
                        ) : null}
                        <DropdownItem
                          icon="copy"
                          onClick={() => {
                            close();
                            void duplicate(test);
                          }}
                        >
                          Сделать копию
                        </DropdownItem>
                        {test.canEdit ? (
                          <DropdownItem
                            icon={test.isPublished ? 'slash' : 'send'}
                            onClick={() => {
                              close();
                              void togglePublish(test);
                            }}
                          >
                            {test.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                          </DropdownItem>
                        ) : null}
                        {test.mine ? (
                          <DropdownItem
                            icon="users"
                            onClick={() => {
                              close();
                              void openShare(test);
                            }}
                          >
                            Поделиться
                          </DropdownItem>
                        ) : null}
                        {test.isPublished ? (
                          <>
                            <div className="my-1 border-t border-line" />
                            <DropdownItem
                              icon="calendar"
                              onClick={() => {
                                close();
                                router.push(`/assignments?testId=${test.id}`);
                              }}
                            >
                              Назначить классу
                            </DropdownItem>
                          </>
                        ) : null}
                        {test.mine ? (
                          <>
                            <div className="my-1 border-t border-line" />
                            <DropdownItem
                              icon="trash"
                              danger
                              onClick={() => {
                                close();
                                void remove(test);
                              }}
                            >
                              Удалить
                            </DropdownItem>
                          </>
                        ) : null}
                      </>
                    )}
                  </Dropdown>
                </div>

                <a href={`/tests/${test.id}`} className="block group">
                  <h3 className="text-base font-bold text-ink group-hover:text-accent transition-colors leading-snug">
                    {test.title}
                  </h3>
                </a>
                {test.description ? (
                  <p className="text-sm text-muted mt-2 line-clamp-3">{test.description}</p>
                ) : null}
              </div>

              <div className="px-5 py-3 border-t border-line bg-surface-2/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-faint">
                  <span className="flex items-center gap-1">
                    <Icon name="list" size={13} /> {test.questionCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="target" size={13} /> {test.maxScore}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="calendar" size={13} /> {test.assignmentCount}
                  </span>
                </div>
                <span className="text-[11px] text-faint">{formatDate(test.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(shareTest)}
        onClose={() => setShareTest(null)}
        title="Доступ коллегам"
        subtitle={shareTest?.title}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setShareTest(null)}>
            Закрыть
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <Select
            value={shareTarget}
            onChange={setShareTarget}
            label="Учитель"
            className="flex-1"
            options={free.map((colleague) => ({
              value: colleague.id,
              label: colleague.subject
                ? `${colleague.fullName} · ${colleague.subject}`
                : colleague.fullName,
            }))}
            placeholder={free.length ? 'Выберите коллегу…' : 'Все коллеги уже добавлены'}
          />
          <Button icon="plus" onClick={addShare}>
            Добавить
          </Button>
        </div>
        <div className="mt-3">
          <Checkbox checked={shareEdit} onChange={setShareEdit} label="Разрешить править тест" />
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="ng-label text-muted mb-2">Уже открыт</div>
          {shareTest?.shares.length ? (
            <ul className="divide-y divide-line">
              {shareTest.shares.map((share) => (
                <li key={share.teacherId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm text-ink font-semibold truncate">{share.fullName}</div>
                    <div className="text-xs text-muted">
                      @{share.login}
                      {share.subject ? ` · ${share.subject}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={share.canEdit ? 'accent' : 'neutral'}>
                      {share.canEdit ? 'может править' : 'только смотрит'}
                    </Badge>
                    <button
                      type="button"
                      title="Закрыть доступ"
                      onClick={() => void revokeShare(share.teacherId)}
                      className="h-8 w-8 flex items-center justify-center text-muted hover:text-danger cursor-pointer"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Пока тест виден только вам{profile ? `, ${profile.fullName.split(' ')[1] ?? ''}` : ''}.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
