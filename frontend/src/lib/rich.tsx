'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';

/**
 * Показ текста задания. Формулы редактор хранит как <span data-formula="…">
 * с исходным LaTeX — здесь они разворачиваются в готовую вёрстку KaTeX.
 * Так один и тот же HTML одинаково выглядит в конструкторе, при проверке
 * и на печатном листе с заданиями.
 */
export function renderFormulas(root: HTMLElement): void {
  const nodes = root.querySelectorAll<HTMLElement>('[data-formula]');
  nodes.forEach((node) => {
    const source = node.getAttribute('data-formula') ?? '';
    if (node.dataset.rendered === source) {
      return;
    }
    try {
      katex.render(source, node, { throwOnError: false, displayMode: false, output: 'html' });
      node.dataset.rendered = source;
    } catch {
      node.textContent = source;
    }
  });
}

interface Props {
  html: string;
  className?: string;
}

export function RichText({ html, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (box.current) {
      renderFormulas(box.current);
    }
  }, [html]);

  return (
    <div
      ref={box}
      className={`ng-rich ${className}`}
      dangerouslySetInnerHTML={{ __html: html || '<p class="text-faint">Без текста</p>' }}
    />
  );
}
