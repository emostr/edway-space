'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, Checkbox, Icon, Input, Select, Textarea, Toggle } from '@/lib/ui';
import { DEFAULT_GRADE_SCALE, OPTION_LETTERS, QUESTION_TYPES, QUESTION_TYPE_LABELS } from '@/lib/catalog';
import { notify } from '@/lib/notify';
import type { AnswerKey, Question, QuestionOption, QuestionType } from '@/lib/types';
import { Editor } from './Editor';

export interface BuilderState {
  title: string;
  description: string;
  instructions: string;
  gradeScale: Record<string, number>;
  variantCount: number;
  questions: Question[];
}

let counter = 0;

function uid(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

export function emptyQuestion(type: QuestionType = 'SINGLE_CHOICE'): Question {
  const options: QuestionOption[] =
    type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE'
      ? [
          { id: uid('o'), content: '' },
          { id: uid('o'), content: '' },
        ]
      : [];
  return {
    id: uid('q'),
    order: 0,
    variant: 0,
    type,
    content: '',
    points: type === 'EXTENDED' ? 5 : 1,
    options,
    answerKey: type === 'SHORT_ANSWER' ? { accepted: [''] } : { correct: [] },
  };
}

export function emptyState(): BuilderState {
  return {
    title: '',
    description: '',
    instructions: 'Ответы записывайте печатными буквами и цифрами, по одному знаку в клетке.',
    gradeScale: { ...DEFAULT_GRADE_SCALE },
    variantCount: 1,
    questions: [emptyQuestion()],
  };
}

interface Props {
  state: BuilderState;
  onChange: (state: BuilderState) => void;
}

export function TestBuilder({ state, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(state.questions[0]?.id ?? null);

  // Максимум считается по варианту: общие задания идут во все, остальные —
  // только в свой. Расхождение между вариантами платформа не пропустит.
  const variantScores = useMemo(
    () =>
      Array.from({ length: state.variantCount }, (_, index) =>
        state.questions
          .filter((question) => !question.variant || question.variant === index + 1)
          .reduce((sum, question) => sum + (question.points || 0), 0),
      ),
    [state.questions, state.variantCount],
  );

  const maxScore = variantScores[0] ?? 0;
  const uneven = new Set(variantScores).size > 1;

  function patch(next: Partial<BuilderState>) {
    onChange({ ...state, ...next });
  }

  function updateQuestion(id: string, next: Partial<Question>) {
    patch({
      questions: state.questions.map((question) =>
        question.id === id ? { ...question, ...next } : question,
      ),
    });
  }

  function addQuestion(type: QuestionType) {
    const question = emptyQuestion(type);
    patch({ questions: [...state.questions, question] });
    setOpen(question.id);
  }

  async function removeQuestion(id: string) {
    if (state.questions.length === 1) {
      notify.warning('В тесте должно остаться хотя бы одно задание');
      return;
    }
    const ok = await notify.confirm({
      title: 'Удалить задание?',
      text: 'Вместе с ним пропадут варианты ответа и ключ проверки.',
      confirmText: 'Удалить',
      danger: true,
    });
    if (ok) {
      patch({ questions: state.questions.filter((question) => question.id !== id) });
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= state.questions.length) {
      return;
    }
    const questions = [...state.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    patch({ questions });
  }

  return (
    <div className="space-y-6">
      <Card title="О тесте" subtitle="Название видно коллегам и печатается на бланке">
        <div className="space-y-4">
          <Input
            value={state.title}
            onChange={(value) => patch({ title: value })}
            label="Название"
            placeholder="Контрольная работа по теме «Дроби»"
            required
          />
          <Textarea
            value={state.description}
            onChange={(value) => patch({ description: value })}
            label="Описание"
            rows={2}
            placeholder="Для чего этот тест и на каком материале"
          />
          <Textarea
            value={state.instructions}
            onChange={(value) => patch({ instructions: value })}
            label="Инструкция для ученика"
            rows={3}
            hint="Печатается вверху бланка. Про печатные буквы лучше напомнить."
          />
        </div>
      </Card>

      <Card
        title="Варианты"
        subtitle="Ученики получат их по очереди — соседям по парте достанутся разные"
      >
        <div className="flex flex-wrap items-end gap-4">
          <Select
            value={state.variantCount}
            onChange={(value) => patch({ variantCount: Number(value) || 1 })}
            label="Сколько вариантов"
            className="w-56"
            options={[1, 2, 3, 4].map((count) => ({
              value: count,
              label: count === 1 ? 'Один — всем одинаковый' : `${count} варианта`,
            }))}
          />
          {state.variantCount > 1 ? (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {variantScores.map((score, index) => (
                <Badge key={index} variant={uneven ? 'warning' : 'neutral'}>
                  Вариант {index + 1} · {score} б.
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        {state.variantCount > 1 ? (
          <p className={`text-xs mt-3 ${uneven ? 'text-warning' : 'text-faint'}`}>
            {uneven
              ? 'Варианты стоят разного числа баллов — шкала оценок одна на всех, уравняйте их.'
              : 'Отметьте у каждого задания его вариант. Задания «во всех вариантах» попадут в каждый бланк.'}
          </p>
        ) : null}
      </Card>

      <Card
        title="Шкала оценок"
        subtitle="Порог в процентах от максимума — ниже тройки ставится двойка"
        actions={<Badge variant="accent">Максимум {maxScore} б.</Badge>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['5', '4', '3'].map((grade) => (
            <Input
              key={grade}
              type="number"
              min={1}
              max={100}
              value={state.gradeScale[grade] ?? 0}
              onChange={(value) =>
                patch({ gradeScale: { ...state.gradeScale, [grade]: Number(value) || 0 } })
              }
              label={`Оценка «${grade}» от`}
              hint={`${Math.round(((state.gradeScale[grade] ?? 0) / 100) * maxScore)} б. из ${maxScore}`}
            />
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {state.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            total={state.questions.length}
            variantCount={state.variantCount}
            open={open === question.id}
            onToggle={() => setOpen(open === question.id ? null : question.id)}
            onChange={(next) => updateQuestion(question.id, next)}
            onRemove={() => void removeQuestion(question.id)}
            onMove={(delta) => move(index, delta)}
          />
        ))}
      </div>

      <Card title="Добавить задание" padding>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => addQuestion(type.value)}
              className="ng-tile-press text-left border border-line bg-surface-2 hover:border-accent p-4 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-ink font-bold text-sm">
                <Icon name={type.icon} size={17} className="text-accent" />
                {type.label}
              </span>
              <span className="block text-xs text-muted mt-1.5 leading-snug">{type.hint}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface QuestionProps {
  question: Question;
  index: number;
  total: number;
  variantCount: number;
  open: boolean;
  onToggle: () => void;
  onChange: (next: Partial<Question>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}

function QuestionCard({
  question,
  index,
  total,
  variantCount,
  open,
  onToggle,
  onChange,
  onRemove,
  onMove,
}: QuestionProps) {
  const key = question.answerKey ?? {};

  function setKey(next: Partial<AnswerKey>) {
    onChange({ answerKey: { ...key, ...next } });
  }

  function setOption(id: string, content: string) {
    onChange({
      options: question.options.map((option) => (option.id === id ? { ...option, content } : option)),
    });
  }

  function addOption() {
    if (question.options.length >= OPTION_LETTERS.length) {
      notify.warning(`Больше ${OPTION_LETTERS.length} вариантов на бланк не помещается`);
      return;
    }
    onChange({ options: [...question.options, { id: uid('o'), content: '' }] });
  }

  function removeOption(id: string) {
    if (question.options.length <= 2) {
      notify.warning('Вариантов должно остаться хотя бы два');
      return;
    }
    onChange({
      options: question.options.filter((option) => option.id !== id),
      answerKey: { ...key, correct: (key.correct ?? []).filter((value) => value !== id) },
    });
  }

  function toggleCorrect(id: string) {
    const correct = key.correct ?? [];
    if (question.type === 'SINGLE_CHOICE') {
      setKey({ correct: [id] });
      return;
    }
    setKey({ correct: correct.includes(id) ? correct.filter((value) => value !== id) : [...correct, id] });
  }

  const accepted = key.accepted ?? [''];

  return (
    <section className={`bg-surface border ${open ? 'border-accent' : 'border-line'} transition-colors`}>
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
        >
          <span className="w-7 h-7 shrink-0 bg-surface-3 text-ink text-xs font-extrabold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-ink font-semibold truncate">
              {stripHtml(question.content) || 'Новое задание'}
            </span>
            <span className="block text-xs text-muted mt-0.5">
              {QUESTION_TYPE_LABELS[question.type]} · {question.points} б.
              {variantCount > 1
                ? question.variant
                  ? ` · вариант ${question.variant}`
                  : ' · во всех вариантах'
                : ''}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            title="Выше"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="h-8 w-8 flex items-center justify-center text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
          >
            <Icon name="chevronUp" size={16} />
          </button>
          <button
            type="button"
            title="Ниже"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="h-8 w-8 flex items-center justify-center text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
          >
            <Icon name="chevronDown" size={16} />
          </button>
          <button
            type="button"
            title="Удалить"
            onClick={onRemove}
            className="h-8 w-8 flex items-center justify-center text-muted hover:text-danger cursor-pointer"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </header>

      {open ? (
        <div className="px-4 pb-5 pt-1 space-y-4 border-t border-line">
          <div>
            <span className="ng-label text-muted block mb-1.5">Текст задания</span>
            <Editor value={question.content} onChange={(html) => onChange({ content: html })} />
          </div>

          {variantCount > 1 ? (
            <Select
              value={question.variant}
              onChange={(value) => onChange({ variant: Number(value) || 0 })}
              label="В каком варианте"
              options={[
                { value: 0, label: 'Во всех вариантах' },
                ...Array.from({ length: variantCount }, (_, i) => ({
                  value: i + 1,
                  label: `Только вариант ${i + 1}`,
                })),
              ]}
              className="sm:max-w-xs"
            />
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              value={question.type}
              onChange={(value) => {
                const type = value as QuestionType;
                const next = emptyQuestion(type);
                onChange({
                  type,
                  options: type === 'SHORT_ANSWER' || type === 'EXTENDED' ? [] : next.options,
                  answerKey: next.answerKey,
                });
              }}
              label="Тип задания"
              options={QUESTION_TYPES.map((type) => ({ value: type.value, label: type.label }))}
            />
            <Input
              type="number"
              min={1}
              max={100}
              value={question.points}
              onChange={(value) => onChange({ points: Math.max(1, Number(value) || 1) })}
              label="Баллов за задание"
            />
          </div>

          {question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE' ? (
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="ng-label text-muted">
                  Варианты ответа · отметьте верные
                </span>
                <Button size="sm" variant="ghost" icon="plus" onClick={addOption}>
                  Вариант
                </Button>
              </div>
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => {
                  const correct = (key.correct ?? []).includes(option.id);
                  return (
                    <div key={option.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        title={correct ? 'Верный ответ' : 'Отметить верным'}
                        onClick={() => toggleCorrect(option.id)}
                        className={`w-9 h-11 shrink-0 border flex items-center justify-center font-extrabold text-sm transition-colors cursor-pointer ${
                          correct
                            ? 'bg-accent border-accent text-on-accent'
                            : 'bg-surface-2 border-line text-muted hover:border-accent'
                        }`}
                      >
                        {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                      </button>
                      <Input
                        value={option.content}
                        onChange={(value) => setOption(option.id, value)}
                        placeholder={`Вариант ${OPTION_LETTERS[optionIndex] ?? optionIndex + 1}`}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        title="Убрать вариант"
                        onClick={() => removeOption(option.id)}
                        className="h-11 w-9 shrink-0 flex items-center justify-center text-muted hover:text-danger cursor-pointer"
                      >
                        <Icon name="minus" size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {question.type === 'MULTIPLE_CHOICE' ? (
                <div className="mt-3">
                  <Toggle
                    checked={Boolean(key.partial)}
                    onChange={(value) => setKey({ partial: value })}
                    label="Засчитывать частично"
                    hint="За каждый верный вариант — доля балла, за лишний — вычет"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {question.type === 'SHORT_ANSWER' ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="ng-label text-muted">Верные ответы</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="plus"
                    onClick={() => setKey({ accepted: [...accepted, ''] })}
                  >
                    Ещё вариант
                  </Button>
                </div>
                <div className="space-y-2">
                  {accepted.map((value, valueIndex) => (
                    <div key={valueIndex} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(next) =>
                          setKey({
                            accepted: accepted.map((item, i) => (i === valueIndex ? next : item)),
                          })
                        }
                        placeholder="Например: 3/4"
                        maxLength={14}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        title="Убрать"
                        onClick={() =>
                          setKey({ accepted: accepted.filter((_, i) => i !== valueIndex) })
                        }
                        className="h-11 w-9 shrink-0 flex items-center justify-center text-muted hover:text-danger cursor-pointer"
                      >
                        <Icon name="minus" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-faint mt-2">
                  До 14 знаков: столько клеток помещается в строку бланка. Регистр и «ё» платформа
                  сверяет сама.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Checkbox
                  checked={Boolean(key.numeric)}
                  onChange={(value) => setKey({ numeric: value })}
                  label="Числовой ответ"
                />
                <Checkbox
                  checked={Boolean(key.caseSensitive)}
                  onChange={(value) => setKey({ caseSensitive: value })}
                  label="Учитывать регистр"
                />
              </div>

              {key.numeric ? (
                <Input
                  type="number"
                  min={0}
                  value={key.tolerance ?? 0}
                  onChange={(value) => setKey({ tolerance: Number(value) || 0 })}
                  label="Допустимое отклонение"
                  hint="Например, 0.01 для ответов с округлением"
                  className="max-w-xs"
                />
              ) : null}
            </div>
          ) : null}

          {question.type === 'EXTENDED' ? (
            <Textarea
              value={key.guideline ?? ''}
              onChange={(value) => setKey({ guideline: value })}
              label="Что засчитывать при проверке"
              rows={3}
              hint="Подсказка себе и коллеге: она видна на странице проверки работы"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<span[^>]*data-formula="([^"]*)"[^>]*>.*?<\/span>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
