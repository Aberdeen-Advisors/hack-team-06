import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 border font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-ink)] border-[var(--color-ink)] text-white hover:bg-[var(--color-ink-soft)]',
  secondary:
    'bg-white border-[var(--color-line-strong)] text-[var(--color-ink)] hover:bg-[var(--color-canvas)]',
  ghost:
    'bg-transparent border-transparent text-[var(--color-slate)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-deep)]',
  danger:
    'bg-white border-[var(--color-critical-line)] text-[var(--color-critical-ink)] hover:bg-[var(--color-critical-bg)]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-[13px] px-2.5 py-1',
  md: 'text-[14px] px-3.5 py-1.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} rounded-[3px] ${className}`}
    >
      {children}
    </button>
  );
}
