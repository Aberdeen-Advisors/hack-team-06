import type { ReactNode } from 'react';

export interface TableProps {
  children: ReactNode;
  className?: string;
}

/** Always scrolls inside its own container so a wide register never scrolls the page. */
export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full border-collapse text-[14px] ${className}`}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-[var(--color-canvas)]">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`border-b border-[var(--color-line)] last:border-b-0 align-top ${className}`}>
      {children}
    </tr>
  );
}

type Align = 'left' | 'right' | 'center';

// Written out rather than interpolated: Tailwind only generates classes it can see literally.
const ALIGN: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function TH({
  children,
  align = 'left',
  className = '',
  width,
}: {
  children?: ReactNode;
  align?: Align;
  className?: string;
  width?: string;
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={`label border-b border-[var(--color-line)] px-3 py-2 font-semibold ${ALIGN[align]} whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  align = 'left',
  className = '',
  colSpan,
}: {
  children?: ReactNode;
  align?: Align;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-3 py-2.5 ${ALIGN[align]} ${className}`}>
      {children}
    </td>
  );
}
