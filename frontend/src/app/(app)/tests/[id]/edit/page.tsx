'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, PageHeader, Skeleton } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { TestBuilder, type BuilderState } from '@/components/TestBuilder';
import type { TestDetail } from '@/lib/types';

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<BuilderState | null>(null);
  const [test, setTest] = useState<TestDetail | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<TestDetail>(`/tests/${id}`);
      setTest(data);
      setState({
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        gradeScale: data.gradeScale,
        variantCount: data.variantCount,
        questions: data.questions,
      });
    } catch (e) {
      notify.error('Не удалось открыть тест', { text: errorMessage(e) });
      router.push('/tests');
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!state) {
      return;
    }
    if (!state.title.trim()) {
      notify.warning('Дайте тесту название');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/tests/${id}`, {
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
      notify.toast('Изменения сохранены');
      router.push(`/tests/${id}`);
    } catch (e) {
      notify.error('Не удалось сохранить', { text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  if (!state) {
    return <Skeleton rows={6} />;
  }

  return (
    <>
      <PageHeader
        title="Правка теста"
        subtitle={
          test && test.assignmentCount > 0
            ? 'У теста есть назначения: уже выданные работы правка не затронет — они держат снимок теста'
            : 'Задания, ключи проверки и шкала оценок'
        }
        actions={
          <>
            <Button variant="ghost" icon="arrowLeft" href={`/tests/${id}`}>
              Отмена
            </Button>
            <Button icon="save" loading={saving} onClick={save}>
              Сохранить
            </Button>
          </>
        }
      />
      <TestBuilder state={state} onChange={setState} />
    </>
  );
}
