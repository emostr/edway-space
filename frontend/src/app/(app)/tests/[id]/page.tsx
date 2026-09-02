'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { RichText } from '@/lib/rich';
import { OPTION_LETTERS, QUESTION_TYPE_LABELS } from '@/lib/catalog';
import { formatDate } from '@/lib/format';
import type { TestDetail } from '@/lib/types';

export default function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [test, setTest] = useState<TestDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setTest(await api.get<TestDetail>(`/tests/${id}`));
    } catch (e) {
      notify.error('Не удалось открыть тест', { text: errorMessage(e) });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublish() {
    if (!test) {
      return;
    }
    setBusy(true);
    try {
      await api.post(`/tests/${id}/${test.isPublished ? 'unpublish' : 'publish'}`);
      await load();
      notify.toast(test.isPublished ? 'Снят с публикации' : 'Тест опубликован');
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  if (!test) {
    return <Skeleton rows={6} />;
  }

  const maxScore = test.questions.reduce((sum, question) => sum + question.points, 0);

  return (
    <>
      <PageHeader
        title={test.title}
        subtitle={test.description || 'Без описания'}
        actions={
          <>
            <Button variant="ghost" icon="arrowLeft" href="/tests">
              К списку
            </Button>
            {test.canEdit ? (
              <Button variant="secondary" icon="edit" href={`/tests/${id}/edit`}>
                Редактировать
              </Button>
            ) : null}
            {test.canEdit ? (
              <Button
                icon={test.isPublished ? 'slash' : 'send'}
                variant={test.isPublished ? 'secondary' : 'primary'}
                loading={busy}
                onClick={togglePublish}
              >
                {test.isPublished ? 'Снять с публикации' : 'Опубликовать'}
              </Button>
            ) : null}
            {test.isPublished ? (
              <Button icon="calendar" href={`/assignments?testId=${id}`}>
                Назначить классу
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge variant={test.isPublished ? 'success' : 'neutral'} dot>
          {test.isPublished ? 'Опубликован' : 'Черновик'}
        </Badge>
        <Badge variant="accent">{maxScore} баллов</Badge>
        <Badge variant="neutral">{test.questions.length} заданий</Badge>
        <Badge variant="info">
          5 — от {test.gradeScale['5']}%, 4 — от {test.gradeScale['4']}%, 3 — от {test.gradeScale['3']}%
        </Badge>
        <span className="text-xs text-faint">
          автор {test.ownerName} · изменён {formatDate(test.updatedAt)}
        </span>
      </div>

      {test.instructions ? (
        <Card title="Инструкция на бланке" className="mb-6">
          <p className="text-sm text-muted whitespace-pre-line">{test.instructions}</p>
        </Card>
      ) : null}

      {test.questions.length ? (
        <div className="space-y-3">
          {test.questions.map((question, index) => (
            <Card key={question.id} padding={false}>
              <div className="flex items-start gap-4 p-5">
                <span className="w-8 h-8 shrink-0 bg-surface-3 text-ink text-sm font-extrabold flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="neutral">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                    <Badge variant="accent">{question.points} б.</Badge>
                  </div>
                  <RichText html={question.content} className="text-sm text-ink" />

                  {question.options.length ? (
                    <ul className="mt-3 space-y-1.5">
                      {question.options.map((option, optionIndex) => {
                        const correct = (question.answerKey.correct ?? []).includes(option.id);
                        return (
                          <li key={option.id} className="flex items-start gap-2.5 text-sm">
                            <span
                              className={`w-6 h-6 shrink-0 flex items-center justify-center text-xs font-extrabold ${
                                correct ? 'bg-accent text-on-accent' : 'bg-surface-3 text-muted'
                              }`}
                            >
                              {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                            </span>
                            <span className={correct ? 'text-ink font-semibold' : 'text-muted'}>
                              <RichText html={option.content} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {question.type === 'SHORT_ANSWER' ? (
                    <p className="mt-3 text-sm text-muted">
                      Ответ:{' '}
                      <span className="text-ink font-semibold">
                        {(question.answerKey.accepted ?? []).join(' / ') || '—'}
                      </span>
                      {question.answerKey.numeric ? ' · числовой' : ''}
                    </p>
                  ) : null}

                  {question.type === 'EXTENDED' ? (
                    <p className="mt-3 text-sm text-muted">
                      Проверяется вручную.{' '}
                      {question.answerKey.guideline ? `Критерий: ${question.answerKey.guideline}` : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding={false}>
          <EmptyState icon="list" title="В тесте нет заданий" />
        </Card>
      )}
    </>
  );
}
