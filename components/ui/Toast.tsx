'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

interface ToastContextValue {
  toast: (text: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONES: Record<ToastTone, string> = {
  info: 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]',
  success:
    'bg-[var(--color-positive-bg)] text-[var(--color-positive-ink)] border-[var(--color-positive-line)]',
  error:
    'bg-[var(--color-critical-bg)] text-[var(--color-critical-ink)] border-[var(--color-critical-line)]',
};

/** Wrap any interactive area that needs to confirm a save. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setMessages((current) => [...current, { id, tone, text }]);
    setTimeout(() => {
      setMessages((current) => current.filter((m) => m.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 no-print">
        {messages.map((message) => (
          <div
            key={message.id}
            role="status"
            className={`border rounded-[3px] px-4 py-2.5 text-[14px] max-w-[380px] ${TONES[message.tone]}`}
            style={{ boxShadow: 'var(--shadow-raised)' }}
          >
            {message.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a no-op outside a provider so a component can be rendered on a static page. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? { toast: () => undefined };
}
