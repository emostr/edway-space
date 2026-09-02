'use client';

import { use, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Icon,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
} from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { RichText } from '@/lib/rich';
import { GRADE_TONES, QUESTION_TYPE_LABELS, WORK_STATUS_LABELS, WORK_STATUS_TONES } from '@/lib/catalog';
import { formatDate } from '@/lib/format';
import type { ClassDetail, WorkAnswer, WorkDetail } from '@/lib/types';

export default function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [students, setStudents] = useState<ClassDetail['students']>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.get<WorkDetail>(`/works/${id}`);
      setWork(data);
      return data;
    } catch (e) {
      notify.error('Не удалось открыть работу', { text: errorMessage(e) });
      return null;
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Список класса нужен, чтобы подписать запасной бланк.
  useEffect(() => {
    if (!work || work.studentId) {
      return;
    }
    void (async () => {
      try {
        const assignment = await api.get<{ classId: string }>(`/assignments/${work.assignmentId}`);
        const detail = await api.get<ClassDetail>(`/classes/${assignment.classId}`);
        setStudents(detail.students);
      } catch {
        /* без списка просто не покажем выбор */
      }
    })();
  }, [work]);

  async function patchAnswer(questionId: string, patch: Partial<WorkAnswer>) {
    setBusy(true);
    try {
      const updated = await api.patch<WorkDetail>(`/works/${id}/answers`, { questionId, ...patch });
      setWork(updated);
    } catch (e) {
      notify.error('Не удалось сохранить', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    setBusy(true);
    try {
      const updated = await api.post<WorkDetail>(`/works/${id}/finalize`, {});
      setWork(updated);
      notify.success('Оценка выставлена', {
        text: `${updated.grade} · ${updated.autoScore + updated.manualScore} из ${updated.maxScore} баллов`,
      });
    } catch (e) {
      notify.error('Не удалось завершить проверку', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    setBusy(true);
    try {
      setWork(await api.post<WorkDetail>(`/works/${id}/reopen`, {}));
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function assignStudent(studentId: string) {
    try {
      setWork(await api.patch<WorkDetail>(`/works/${id}/student`, { studentId }));
      notify.toast('Работа подписана');
    } catch (e) {
      notify.error('Не удалось подписать работу', { text: errorMessage(e) });
    }
  }

  async function reset() {
    const ok = await notify.confirm({
      title: 'Сбросить работу?',
      text: 'Сканы и распознанные ответы удалятся, работа вернётся в состояние «не сдана».',
      confirmText: 'Сбросить',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      setWork(await api.post<WorkDetail>(`/works/${id}/reset`, {}));
      notify.toast('Работа сброшена');
    } catch (e) {
      notify.error('Не удалось сбросить', { text: errorMessage(e) });
    }
  }

  if (!work) {
    return <Skeleton rows={6} />;
  }

  const total = work.autoScore + work.manualScore;
  const current = work.pages[page];

  return (
    <>
      <PageHeader
        title={work.studentName || 'Запасной бланк'}
        subtitle={`${work.testTitle} · ${work.className} · ${formatDate(work.date)}`}
        actions={
          <>
            <Button variant="ghost" icon="arrowLeft" href={`/assignments/${work.assignmentId}`}>
              К назначению
            </Button>
            {work.status === 'CHECKED' ? (
              <Button variant="secondary" icon="unlock" loading={busy} onClick={reopen}>
                Вернуть на проверку
              </Button>
            ) : (
              <Button icon="check" loading={busy} onClick={finalize}>
                Завершить и выставить оценку
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge variant={WORK_STATUS_TONES[work.status]} dot>
          {WORK_STATUS_LABELS[work.status]}
        </Badge>
        <Badge variant="accent">
          {total} из {work.maxScore} баллов · {work.percent}%
        </Badge>
        {work.variantCount > 1 ? <Badge variant="info">вариант {work.variant}</Badge> : null}
        {work.grade ? <Badge variant={GRADE_TONES[work.grade]}>оценка {work.grade}</Badge> : null}
        <span className="text-xs text-faint">
          код {work.code.slice(0, 4)}-{work.code.slice(4)}
        </span>
      </div>

      {!work.studentId && students.length ? (
        <Card title="Чья это работа?" subtitle="Бланк был запасным — подпишите его" className="mb-6">
          <Select
            value=""
            onChange={(value) => void assignStudent(value)}
            options={students.map((student) => ({ value: student.id, label: student.fullName }))}
            placeholder="Выберите ученика…"
            className="max-w-sm"
          />
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-3">
          {work.questions.map((question) => {
            const answer = work.answers.find((item) => item.questionId === question.id);
            if (!answer) {
              return null;
            }
            return (
              <Card key={question.id} padding={false}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 shrink-0 bg-surface-3 text-ink text-xs font-extrabold flex items-center justify-center">
                        {answer.number}
                      </span>
                      <Badge variant="neutral">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                      {answer.auto ? null : <Badge variant="info">проверено вручную</Badge>}
                      {answer.auto && answer.confidence < 0.75 && answer.raw ? (
                        <Badge variant="warning">прочитано неуверенно</Badge>
                      ) : null}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-ink shrink-0">
                      {answer.score} / {answer.maxScore}
                    </span>
                  </div>

                  <RichText html={question.content} className="text-sm text-ink mb-3" />

                  {question.options.length ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {question.options.map((option) => {
                        const correct = (question.answerKey.correct ?? []).includes(option.id);
                        return (
                          <span
                            key={option.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs border ${
                              correct ? 'border-accent text-accent' : 'border-line text-muted'
                            }`}
                          >
                            <span className="font-extrabold">{option.letter}</span>
                            <RichText html={option.content} />
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  {question.type === 'SHORT_ANSWER' ? (
                    <p className="text-xs text-muted mb-3">
                      Эталон: <span className="text-ink">{(question.answerKey.accepted ?? []).join(' / ')}</span>
                    </p>
                  ) : null}

                  {question.type === 'EXTENDED' && question.answerKey.guideline ? (
                    <Alert variant="info" className="mb-3">
                      {question.answerKey.guideline}
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-3">
                    {question.type === 'EXTENDED' ? (
                      <Input
                        type="number"
                        min={0}
                        max={question.points}
                        value={answer.score}
                        onChange={(value) =>
                          void patchAnswer(question.id, { score: Math.min(question.points, Number(value) || 0) })
                        }
                        label="Баллы"
                        className="w-32"
                      />
                    ) : (
                      <>
                        <Input
                          value={answer.raw}
                          onChange={(value) => void patchAnswer(question.id, { raw: value })}
                          label="Ответ ученика"
                          placeholder="—"
                          className="flex-1 min-w-[160px]"
                          hint="Правка пересчитывает балл по ключу"
                        />
                        <div className="flex items-center gap-1.5 pb-1">
                          <button
                            type="button"
                            title="Засчитать"
                            onClick={() => void patchAnswer(question.id, { correct: true })}
                            className={`h-10 w-10 flex items-center justify-center border transition-colors cursor-pointer ${
                              answer.correct === true
                                ? 'bg-success border-success text-white'
                                : 'border-line text-muted hover:border-success hover:text-success'
                            }`}
                          >
                            <Icon name="check" size={18} />
                          </button>
                          <button
                            type="button"
                            title="Не засчитывать"
                            onClick={() => void patchAnswer(question.id, { correct: false })}
                            className={`h-10 w-10 flex items-center justify-center border transition-colors cursor-pointer ${
                              answer.correct === false
                                ? 'bg-danger border-danger text-white'
                                : 'border-line text-muted hover:border-danger hover:text-danger'
                            }`}
                          >
                            <Icon name="close" size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <Textarea
                    value={answer.comment}
                    onChange={(value) => void patchAnswer(question.id, { comment: value })}
                    label="Комментарий"
                    rows={2}
                    className="mt-3"
                    placeholder="Что не так — увидите вы, когда вернётесь к работе"
                  />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card
            title="Скан работы"
            subtitle={work.pages.length ? `Страница ${page + 1} из ${work.pages.length}` : 'Скана нет'}
            padding={false}
            actions={
              work.pages.length > 1 ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="chevronLeft"
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="chevronRight"
                    onClick={() => setPage((value) => Math.min(work.pages.length - 1, value + 1))}
                  />
                </div>
              ) : null
            }
          >
            {current ? (
              <a href={current.url} target="_blank" rel="noreferrer">
                <img src={current.url} alt="Скан бланка" className="w-full bg-white" />
              </a>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-muted">
                  Работа ещё не загружена. Отсканируйте бланк и загрузите его на странице назначения —
                  или впишите ответы руками слева.
                </p>
              </div>
            )}
          </Card>

          {work.pages.length ? (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" icon="trash" onClick={reset}>
                Сбросить работу
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
