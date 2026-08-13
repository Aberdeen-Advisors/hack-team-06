'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  initialId?: string;
  /** Called when the active tab changes, for pages that want to track it. */
  onChange?: (id: string) => void;
}

export function Tabs({ items, initialId, onChange }: TabsProps) {
  const [active, setActive] = useState(initialId ?? items[0]?.id ?? '');
  const current = items.find((i) => i.id === active) ?? items[0];

  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap gap-6 border-b border-[var(--color-line)] mb-5"
      >
        {items.map((item) => {
          const isActive = item.id === current?.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActive(item.id);
                onChange?.(item.id);
              }}
              className={`label -mb-px border-b-2 pb-2.5 pt-1 transition-colors ${
                isActive
                  ? 'border-[var(--color-amber)] text-[var(--color-ink)]'
                  : 'border-transparent hover:text-[var(--color-ink)]'
              }`}
            >
              {item.label}
              {item.count !== undefined ? (
                <span className="ml-1.5 tabular text-[var(--color-slate-light)]">{item.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
