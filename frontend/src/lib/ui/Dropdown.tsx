'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface Props {
  align?: 'left' | 'right';
  width?: number;
  trigger?: ReactNode;
  children: (close: () => void) => ReactNode;
}

export function Dropdown({ align = 'right', width = 220, trigger, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, origin: 'top' as 'top' | 'bottom' });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const element = triggerRef.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const gap = 6;
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const below = window.innerHeight - rect.bottom;
    // Не хватает места снизу — раскрываемся вверх.
    const flip = below < menuHeight + gap && rect.top > below;

    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    setPos({
      top: flip ? rect.top - gap - menuHeight : rect.bottom + gap,
      left,
      origin: flip ? 'bottom' : 'top',
    });
  }, [align, width]);

  // Позиционируем после того, как меню появилось в DOM и получило высоту.
  useLayoutEffect(() => {
    if (open) {
      place();
    }
  }, [open, place]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-block cursor-pointer text-left"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger ?? (
          <span className="p-2 text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer inline-flex">
            <Icon name="more" size={18} />
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <>
              {/*
                Прозрачная подложка вместо слушателя на document: клик мимо меню
                гарантированно закрывает его, а порядок всплытия событий больше
                ни на что не влияет.
              */}
              <button
                type="button"
                aria-label="Закрыть меню"
                className="fixed inset-0 z-[110] cursor-default"
                onClick={() => setOpen(false)}
              />
              <div
                ref={menuRef}
                role="menu"
                tabIndex={-1}
                className="fixed z-[120] bg-surface border border-line shadow-2xl py-1 ng-enter"
                style={{ top: pos.top, left: pos.left, width, transformOrigin: pos.origin }}
              >
                {children(() => setOpen(false))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
