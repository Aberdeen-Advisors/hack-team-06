'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { WORKSPACE_NAV } from '@/lib/nav';

export function WorkspaceNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {WORKSPACE_NAV.map((item) => {
        const active =
          item.href === '/workspace' ? pathname === '/workspace' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.hint}
            className={`block border-l-2 px-3 py-1.5 text-[14px] transition-colors ${
              active
                ? 'border-[var(--color-amber)] bg-white font-medium text-[var(--color-ink)]'
                : 'border-transparent text-[var(--color-slate)] hover:text-[var(--color-ink)] hover:bg-white/60'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
