import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { InputHTMLAttributes } from 'react';

const CONTROL =
  'w-full bg-white border border-[var(--color-line-strong)] rounded-[3px] px-2.5 py-1.5 text-[14px] placeholder:text-[var(--color-slate-light)] disabled:bg-[var(--color-canvas)]';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, htmlFor, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label block mb-1.5">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-[12px] text-[var(--color-slate)] mt-1">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-[12px] text-[var(--color-critical-ink)] mt-1">{error}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${CONTROL} ${className}`} />;
}

export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${CONTROL} ${className}`}>
      {children}
    </select>
  );
}

export function Textarea({
  className = '',
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} rows={rows} className={`${CONTROL} ${className}`} />;
}
