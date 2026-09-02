import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';

export interface MathOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formula: {
      insertFormula: (latex: string) => ReturnType;
      updateFormula: (latex: string) => ReturnType;
    };
  }
}

/**
 * Формула как единый неделимый знак в строке текста. В документе она живёт
 * как <span data-formula="\frac{1}{2}">: исходный LaTeX сохраняется как есть,
 * поэтому формулу можно отредактировать позже, а бланк и страница проверки
 * рисуют её тем же KaTeX, что и редактор.
 */
export const MathInline = Node.create<MathOptions>({
  name: 'formula',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-formula') ?? '',
        renderHTML: (attributes) => ({ 'data-formula': attributes.latex as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-formula]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'ng-formula' }, this.options.HTMLAttributes, HTMLAttributes)];
  },

  renderText({ node }) {
    return String(node.attrs.latex ?? '');
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'ng-formula';
      dom.setAttribute('data-formula', String(node.attrs.latex ?? ''));
      render(dom, String(node.attrs.latex ?? ''));

      return {
        dom,
        update(updated) {
          if (updated.type.name !== 'formula') {
            return false;
          }
          const latex = String(updated.attrs.latex ?? '');
          dom.setAttribute('data-formula', latex);
          render(dom, latex);
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertFormula:
        (latex: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex } }),
      updateFormula:
        (latex: string) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { latex }),
    };
  },
});

function render(element: HTMLElement, latex: string): void {
  if (!latex.trim()) {
    element.classList.add('is-empty');
    element.textContent = '';
    return;
  }
  element.classList.remove('is-empty');
  try {
    katex.render(latex, element, { throwOnError: false, displayMode: false, output: 'html' });
  } catch {
    element.textContent = latex;
  }
}
