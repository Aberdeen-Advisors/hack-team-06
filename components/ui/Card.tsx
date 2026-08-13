import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Removes the inner padding so a table can sit flush inside the card. */
  flush?: boolean;
  /** Stable hook for the end-to-end script, so it can scope assertions to one card. */
  testId?: string;
}

export function Card({ children, className = '', flush = false, testId }: CardProps) {
  return (
    <section
      data-testid={testId}
      className={`bg-white border border-[var(--color-line)] rounded-[4px] ${flush ? '' : 'p-5'} ${className}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-[var(--color-line)]">
      <div>
        <h3 className="text-[17px]">{title}</h3>
        {hint ? <p className="text-[13px] text-[var(--color-slate)] mt-0.5">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
