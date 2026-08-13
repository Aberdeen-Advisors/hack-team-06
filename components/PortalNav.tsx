'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { PORTAL_NAV } from '@/lib/nav';

export function PortalNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Preserve the preview flag so an Aberdeen user is not bounced out mid-navigation.
  const suffix = searchParams.get('preview') === '1' ? '?preview=1' : '';

  return (
    <nav className="flex flex-wrap gap-6">
      {PORTAL_NAV.map((item) => {
        const active =
          item.href === '/portal' ? pathname === '/portal' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={`${item.href}${suffix}`}
            title={item.hint}
            className={`label -mb-px border-b-2 pb-3 pt-1 ${
              active
                ? 'border-[var(--color-amber)] text-[var(--color-ink)]'
                : 'border-transparent hover:text-[var(--color-ink)]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
