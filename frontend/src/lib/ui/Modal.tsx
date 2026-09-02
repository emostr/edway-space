'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: Size;
  closable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title = '',
  subtitle = '',
  size = 'md',
  closable = true,
  header,
  footer,
  children,
}: Props) {
  // Фон под модалкой не должен прокручиваться вместе с ней.
  useEffect(() => {
    if (!open) {
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, closable, onClose]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <button
        type="button"
        aria-label="Закрыть"
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] cursor-default"
        onClick={() => closable && onClose()}
      />
      <div
        className={`relative w-full bg-surface border border-line border-l-[3px] border-l-accent shadow-2xl mt-4 sm:mt-12 ng-enter ${SIZES[size]}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-line">
          <div className="min-w-0">
            {header ?? (
              <>
                <h3 className="text-lg font-bold text-ink truncate">{title}</h3>
                {subtitle ? <p className="text-sm text-muted mt-0.5">{subtitle}</p> : null}
              </>
            )}
          </div>
          {closable ? (
            <button
              type="button"
              aria-label="Закрыть"
              className="shrink-0 -mr-1 p-1 text-muted hover:text-danger transition-colors cursor-pointer"
              onClick={onClose}
            >
              <Icon name="close" size={20} />
            </button>
          ) : null}
        </header>

        <div className="px-6 py-5">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-line bg-surface-2/40">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
