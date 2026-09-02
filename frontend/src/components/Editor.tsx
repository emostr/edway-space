'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { EditorContent, useEditor, type Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Button, Icon, Input, Modal } from '@/lib/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { MathInline } from './MathNode';

/** Готовые заготовки: набирать их руками каждый раз незачем. */
const SNIPPETS: { label: string; latex: string }[] = [
  { label: 'Дробь', latex: '\\frac{a}{b}' },
  { label: 'Степень', latex: 'x^{2}' },
  { label: 'Индекс', latex: 'x_{1}' },
  { label: 'Корень', latex: '\\sqrt{x}' },
  { label: 'Корень n-й', latex: '\\sqrt[n]{x}' },
  { label: 'Сумма', latex: '\\sum_{i=1}^{n} a_i' },
  { label: 'Интеграл', latex: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Предел', latex: '\\lim_{x \\to 0} f(x)' },
  { label: 'Система', latex: '\\begin{cases} x + y = 2 \\\\ x - y = 0 \\end{cases}' },
  { label: 'Не равно', latex: 'a \\neq b' },
  { label: 'Меньше-равно', latex: 'a \\leqslant b' },
  { label: 'Градусы', latex: '90^{\\circ}' },
  { label: 'Пи', latex: '\\pi' },
  { label: 'Альфа', latex: '\\alpha' },
  { label: 'Умножить', latex: 'a \\cdot b' },
  { label: 'Треугольник', latex: '\\triangle ABC' },
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function Editor({ value, onChange, placeholder = 'Текст задания…', minHeight = 120 }: Props) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [formula, setFormula] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLDivElement>(null);

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
    setFormulaOpen(true);
  }, [editor]);

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
        size="lg"
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
        <Input
          value={formula}
          onChange={setFormula}
          label="Формула"
          placeholder="\frac{1}{2} + \sqrt{x}"
          autoFocus
        />

        <div className="mt-4">
          <div className="ng-label text-muted mb-2">Предпросмотр</div>
          <div
            ref={preview}
            className="border border-line bg-surface px-4 py-5 text-center text-ink min-h-[64px] flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: renderPreview(formula) }}
          />
        </div>

        <div className="mt-4">
          <div className="ng-label text-muted mb-2">Заготовки</div>
          <div className="flex flex-wrap gap-1.5">
            {SNIPPETS.map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                className="px-2.5 py-1 text-xs border border-line bg-surface hover:border-accent hover:text-accent transition-colors cursor-pointer"
                onClick={() => setFormula((current) => (current ? `${current} ${snippet.latex}` : snippet.latex))}
              >
                {snippet.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>
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
