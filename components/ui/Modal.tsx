'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = '620px',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6"
      style={{ background: 'rgba(16, 27, 43, 0.4)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white border border-[var(--color-line)] rounded-[4px] w-full my-8"
        style={{ maxWidth: width, boxShadow: 'var(--shadow-raised)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-6 px-6 pt-5 pb-4 border-b border-[var(--color-line)]">
          <div>
            <h2 className="text-[20px]">{title}</h2>
            {subtitle ? (
              <p className="text-[13px] text-[var(--color-slate)] mt-1">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--color-slate)] hover:text-[var(--color-ink)] text-[20px] leading-none"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-line)] bg-[var(--color-canvas)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
