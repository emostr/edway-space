'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Modal,
  PageHeader,
  Progress,
  Select,
  Skeleton,
  Table,
} from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDate } from '@/lib/format';
import { GRADE_TONES, WORK_STATUS_LABELS, WORK_STATUS_TONES } from '@/lib/catalog';
import type { AssignmentDetail, UploadOutcome } from '@/lib/types';

export default function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const [outcome, setOutcome] = useState<UploadOutcome | null>(null);
  const [attachTo, setAttachTo] = useState('');
  const [attachFile, setAttachFile] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<AssignmentDetail>(`/assignments/${id}`));
    } catch (e) {
      notify.error('Не удалось открыть назначение', { text: errorMessage(e) });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: FileList) {
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('files', file));
      const result = await api.upload<UploadOutcome>(`/assignments/${id}/scans`, form);
      setOutcome(result);
      await load();
      if (result.matched.length) {
        notify.toast(`Распознано листов: ${result.matched.length}`);
      }
    } catch (e) {
      notify.error('Не удалось загрузить сканы', { text: errorMessage(e) });
    } finally {
      setUploading(false);
      if (fileInput.current) {
        fileInput.current.value = '';
      }
    }
  }

  async function attach() {
    if (!attachFile || !attachTo) {
      notify.warning('Выберите работу, к которой отнести лист');
      return;
    }
    try {
      await api.post(`/works/${attachTo}/pages`, { file: attachFile });
      setOutcome((current) =>
        current ? { ...current, unmatched: current.unmatched.filter((item) => item.file !== attachFile) } : current,
      );
      setAttachFile(null);
      setAttachTo('');
      await load();
      notify.toast('Лист привязан');
    } catch (e) {
      notify.error('Не удалось привязать лист', { text: errorMessage(e) });
    }
  }

  async function toggleClosed() {
    if (!data) {
      return;
    }
    try {
      await api.post(`/assignments/${id}/${data.closedAt ? 'reopen' : 'close'}`, {});
      await load();
      notify.toast(data.closedAt ? 'Проверка возобновлена' : 'Проверка завершена');
    } catch (e) {
      notify.error('Не удалось', { text: errorMessage(e) });
    }
  }

  async function remove() {
    const ok = await notify.confirm({
      title: 'Удалить назначение?',
      text: 'Вместе с ним пропадут все работы, сканы и выставленные оценки.',
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      await api.del(`/assignments/${id}`);
      notify.toast('Назначение удалено');
      router.push('/assignments');
    } catch (e) {
      notify.error('Не удалось удалить', { text: errorMessage(e) });
    }
  }

  if (!data) {
    return <Skeleton rows={6} />;
  }

  const checked = data.works.filter((work) => work.status === 'CHECKED').length;
  const scanned = data.works.filter((work) => work.status !== 'PENDING').length;

  return (
    <>
      <PageHeader
        title={data.testTitle}
        subtitle={`${data.className} · ${formatDate(data.date)}${data.note ? ` · ${data.note}` : ''}`}
        actions={
          <>
            <Button variant="ghost" icon="arrowLeft" href="/assignments">
              К списку
            </Button>
            <Button variant="secondary" icon="printer" href={`/print/${id}`}>
              Печать бланков
            </Button>
            <Button icon="upload" loading={uploading} onClick={() => fileInput.current?.click()}>
              Загрузить сканы
            </Button>
          </>
        }
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void upload(event.target.files);
          }
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card title="Готовность" subtitle={`Сдано ${scanned} из ${data.works.length}`}>
          <Progress
            value={data.works.length ? (checked / data.works.length) * 100 : 0}
            showValue
            label={`Проверено ${checked}`}
            variant={checked === data.works.length ? 'success' : 'accent'}
          />
          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={data.closedAt ? 'unlock' : 'check'} onClick={toggleClosed}>
              {data.closedAt ? 'Возобновить' : 'Завершить проверку'}
            </Button>
            <Button size="sm" variant="ghost" icon="trash" onClick={remove}>
              Удалить
            </Button>
          </div>
        </Card>

        <Card title="Как проверять" className="lg:col-span-2">
          <ol className="text-sm text-muted space-y-1.5 list-decimal pl-4">
            <li>Распечатайте бланки — на каждом уже стоит фамилия и код работы.</li>
            <li>
              Ученики пишут ответы <span className="text-ink font-semibold">печатными</span> буквами и
              цифрами, по одному знаку в клетке.
            </li>
            <li>Отсканируйте листы и загрузите их пачкой: платформа сама разложит по ученикам.</li>
            <li>Закрытые задания проверятся автоматически, развёрнутые останутся вам.</li>
          </ol>
        </Card>
      </div>

      {outcome && outcome.unmatched.length ? (
        <Alert variant="warning" title="Не удалось разобрать листы" className="mb-4">
          <ul className="mt-2 space-y-2">
            {outcome.unmatched.map((item) => (
              <li key={item.file} className="flex flex-wrap items-center gap-3">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-accent hover:underline text-xs">
                  посмотреть скан
                </a>
                <span className="text-xs text-muted flex-1 min-w-[200px]">{item.reason}</span>
                <Button size="sm" variant="secondary" onClick={() => setAttachFile(item.file)}>
                  Привязать вручную
                </Button>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {data.works.length ? (
        <Table
          columns={[
            { key: 'student', label: 'Ученик' },
            { key: 'code', label: 'Код бланка', hideOnMobile: true, width: '140px' },
            { key: 'status', label: 'Статус', width: '160px' },
            { key: 'score', label: 'Баллы', align: 'right', width: '110px' },
            { key: 'grade', label: 'Оценка', align: 'right', width: '90px' },
            { key: 'action', label: '', align: 'right', width: '120px' },
          ]}
          rows={data.works}
          rowKey={(row) => row.id}
          row={(row) => (
            <>
              <td className="px-4 py-3 align-middle">
                <a href={`/works/${row.id}`} className="font-semibold text-ink hover:text-accent">
                  {row.studentName || 'Запасной бланк'}
                </a>
                {row.pages > 0 ? (
                  <span className="ml-2 text-xs text-faint">
                    <Icon name="image" size={12} className="inline" /> {row.pages}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 align-middle hidden md:table-cell">
                <code className="text-xs text-muted tracking-wider">
                  {row.code.slice(0, 4)}-{row.code.slice(4)}
                </code>
              </td>
              <td className="px-4 py-3 align-middle">
                <Badge variant={WORK_STATUS_TONES[row.status]} dot>
                  {WORK_STATUS_LABELS[row.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 align-middle text-right text-sm tabular-nums text-ink">
                {row.status === 'PENDING' ? '—' : `${row.autoScore + row.manualScore} / ${row.maxScore}`}
              </td>
              <td className="px-4 py-3 align-middle text-right">
                {row.grade ? (
                  <Badge variant={GRADE_TONES[row.grade]}>{row.grade}</Badge>
                ) : (
                  <span className="text-faint text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 align-middle text-right">
                <Button size="sm" variant="ghost" iconRight="chevronRight" href={`/works/${row.id}`}>
                  {row.status === 'CHECKED' ? 'Открыть' : 'Проверить'}
                </Button>
              </td>
            </>
          )}
        />
      ) : (
        <Card padding={false}>
          <EmptyState icon="users" title="В назначении нет работ" />
        </Card>
      )}

      <Modal
        open={Boolean(attachFile)}
        onClose={() => setAttachFile(null)}
        title="Чей это лист?"
        subtitle="Код не прочитался — выберите ученика вручную"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAttachFile(null)}>
              Отмена
            </Button>
            <Button icon="check" onClick={attach}>
              Привязать
            </Button>
          </>
        }
      >
        {attachFile ? (
          <img
            src={`/api/files/${attachFile}`}
            alt="Скан работы"
            className="w-full max-h-[320px] object-contain border border-line bg-surface-2 mb-4"
          />
        ) : null}
        <Select
          value={attachTo}
          onChange={setAttachTo}
          label="Работа"
          options={data.works.map((work) => ({
            value: work.id,
            label: `${work.studentName || 'Запасной бланк'} · ${work.code}`,
          }))}
          placeholder="Выберите работу…"
        />
      </Modal>
    </>
  );
}
