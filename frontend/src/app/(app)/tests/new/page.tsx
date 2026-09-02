'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, PageHeader } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { TestBuilder, emptyState, type BuilderState } from '@/components/TestBuilder';
import type { TestDetail } from '@/lib/types';

export default function NewTestPage() {
  const router = useRouter();
  const [state, setState] = useState<BuilderState>(emptyState());
  const [saving, setSaving] = useState(false);

  async function save(publish: boolean) {
    if (!state.title.trim()) {
      notify.warning('Дайте тесту название');
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<TestDetail>('/tests', {
        title: state.title,
        description: state.description,
        instructions: state.instructions,
        gradeScale: state.gradeScale,
        variantCount: state.variantCount,
        questions: state.questions.map((question) => ({
          type: question.type,
          variant: question.variant,
          content: question.content,
          points: question.points,
          options: question.options,
          answerKey: question.answerKey,
        })),
      });
      if (publish) {
        await api.post(`/tests/${created.id}/publish`);
      }
      notify.toast(publish ? 'Тест опубликован' : 'Черновик сохранён');
      router.push(`/tests/${created.id}`);
    } catch (e) {
      notify.error('Не удалось сохранить', { text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Новый тест"
        subtitle="Задания, ключи проверки и шкала оценок"
        actions={
          <>
            <Button variant="ghost" icon="arrowLeft" href="/tests">
              К списку
            </Button>
            <Button variant="secondary" icon="save" loading={saving} onClick={() => void save(false)}>
              Сохранить черновик
            </Button>
            <Button icon="send" loading={saving} onClick={() => void save(true)}>
              Опубликовать
            </Button>
          </>
        }
      />
      <TestBuilder state={state} onChange={setState} />
    </>
  );
}
