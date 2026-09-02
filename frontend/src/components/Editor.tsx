'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { EditorContent, useEditor, type Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Button, Icon, Input, Modal, Textarea } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { FORMULA_GROUPS } from '@/lib/formulas';
import { MathInline } from './MathNode';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function Editor({ value, onChange, placeholder = 'Текст задания…', minHeight = 120 }: Props) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [formula, setFormula] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const formulaField = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    // Разметку страницы Next рисует и на сервере: без этого флага React
    // ругается на расхождение с клиентской версией редактора.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [3] } }),
      Image.configure({ inline: false, allowBase64: false }),
      MathInline,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'ng-rich px-3 py-2.5 text-sm text-ink outline-none',
        style: `min-height:${minHeight}px`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  // Внешняя замена значения (загрузили тест на правку) должна попасть в редактор,
  // но не сбивать курсор при обычном наборе.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  const openFormula = useCallback(() => {
    if (!editor) {
      return;
    }
    const active = editor.isActive('formula');
    setEditing(active);
    setFormula(active ? String(editor.getAttributes('formula').latex ?? '') : '');
    setSearch('');
    setFormulaOpen(true);
  }, [editor]);

  /**
   * Заготовка вставляется туда, где стоит курсор, а не в конец строки: иначе
   * дописать степень внутри уже набранной дроби невозможно.
   */
  function insertSnippet(latex: string) {
    const field = formulaField.current;
    if (!field) {
      setFormula((current) => (current ? `${current} ${latex}` : latex));
      return;
    }
    const start = field.selectionStart ?? formula.length;
    const end = field.selectionEnd ?? formula.length;
    const next = `${formula.slice(0, start)}${latex}${formula.slice(end)}`;
    setFormula(next);
    // Возвращаем курсор за вставленный кусок, чтобы можно было печатать дальше.
    requestAnimationFrame(() => {
      field.focus();
      const caret = start + latex.length;
      field.setSelectionRange(caret, caret);
    });
  }

  function applyFormula() {
    if (!editor || !formula.trim()) {
      return;
    }
    if (editing) {
      editor.chain().focus().updateFormula(formula).run();
    } else {
      editor.chain().focus().insertFormula(formula).run();
    }
    setFormulaOpen(false);
    setFormula('');
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.upload<{ url: string }>('/files/images', form);
      editor?.chain().focus().setImage({ src: res.url }).run();
    } catch (e) {
      notify.error('Не удалось загрузить картинку', { text: errorMessage(e) });
    } finally {
      setUploading(false);
      if (fileInput.current) {
        fileInput.current.value = '';
      }
    }
  }

  if (!editor) {
    return <div className="border border-line bg-surface-2" style={{ minHeight }} />;
  }

  return (
    <div className="border border-line bg-surface-2 focus-within:border-accent transition-colors">
      <Toolbar editor={editor} onFormula={openFormula} onImage={() => fileInput.current?.click()} busy={uploading} />
      <EditorContent editor={editor} />
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadImage(file);
          }
        }}
      />

      <Modal
        open={formulaOpen}
        onClose={() => setFormulaOpen(false)}
        title={editing ? 'Правка формулы' : 'Формула'}
        subtitle="Синтаксис LaTeX — как в учебнике"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormulaOpen(false)}>
              Отмена
            </Button>
            <Button icon="check" onClick={applyFormula}>
              {editing ? 'Сохранить' : 'Вставить'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <Textarea
              ref={formulaField}
              value={formula}
              onChange={setFormula}
              label="Формула"
              rows={4}
              placeholder="\frac{1}{2} + \sqrt{x}"
              autoFocus
            />

            <div className="mt-4">
              <div className="ng-label text-muted mb-2">Предпросмотр</div>
              <div
                className="border border-line bg-surface px-4 py-5 text-center text-ink min-h-[84px] flex items-center justify-center overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: renderPreview(formula) }}
              />
            </div>
          </div>

          <div className="min-w-0">
            <Input
              value={search}
              onChange={setSearch}
              label="Заготовки"
              icon="search"
              placeholder="дробь, корень, вектор…"
            />
            <SnippetList search={search} onPick={insertSnippet} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface SnippetListProps {
  search: string;
  onPick: (latex: string) => void;
}

/** Заготовки по разделам; поиск сводит их в один список подходящих. */
function SnippetList({ search, onPick }: SnippetListProps) {
  const needle = search.trim().toLowerCase();
  const groups = FORMULA_GROUPS.map((group) => ({
    title: group.title,
    items: needle
      ? group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(needle) || item.latex.toLowerCase().includes(needle),
        )
      : group.items,
  })).filter((group) => group.items.length);

  if (!groups.length) {
    return <p className="text-sm text-muted mt-4">Ничего не нашлось — наберите формулу вручную.</p>;
  }

  return (
    <div className="mt-3 max-h-[420px] overflow-y-auto pr-1 space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <div className="ng-label text-faint mb-1.5">{group.title}</div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <button
                key={`${group.title}-${item.label}`}
                type="button"
                title={item.latex}
                data-latex={item.latex}
                className="px-2.5 py-1 text-xs border border-line bg-surface hover:border-accent hover:text-accent transition-colors cursor-pointer"
                onClick={() => onPick(item.latex)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderPreview(latex: string): string {
  if (!latex.trim()) {
    return '<span style="color:var(--ng-faint);font-size:13px">Здесь появится формула</span>';
  }
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' });
  } catch {
    return `<span style="color:var(--ng-danger)">${latex}</span>`;
  }
}

interface ToolbarProps {
  editor: TipTapEditor;
  onFormula: () => void;
  onImage: () => void;
  busy: boolean;
}

function Toolbar({ editor, onFormula, onImage, busy }: ToolbarProps) {
  const button = (icon: string, title: string, action: () => void, active = false) => (
    <button
      key={title}
      type="button"
      title={title}
      onClick={action}
      className={`h-8 w-8 flex items-center justify-center transition-colors cursor-pointer ${
        active ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink hover:bg-surface-3'
      }`}
    >
      <Icon name={icon} size={16} />
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-line bg-surface">
      {button('bold', 'Полужирный', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {button('italic', 'Курсив', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {button(
        'list',
        'Список',
        () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive('bulletList'),
      )}
      {button(
        'listOrdered',
        'Нумерованный список',
        () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive('orderedList'),
      )}
      <span className="w-px h-5 bg-line mx-1" />
      {button('sigma', 'Формула (LaTeX)', onFormula, editor.isActive('formula'))}
      <button
        type="button"
        title="Картинка"
        onClick={onImage}
        disabled={busy}
        className="h-8 w-8 flex items-center justify-center text-muted hover:text-ink hover:bg-surface-3 transition-colors cursor-pointer disabled:opacity-40"
      >
        <Icon name={busy ? 'refresh' : 'image'} size={16} className={busy ? 'animate-spin' : ''} />
      </button>
      <span className="flex-1" />
      {button('refresh', 'Очистить форматирование', () =>
        editor.chain().focus().unsetAllMarks().clearNodes().run(),
      )}
    </div>
  );
}
