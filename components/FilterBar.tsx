'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Select } from '@/components/ui';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSpec {
  /** Query-string key this control owns. */
  param: string;
  label: string;
  /** Shown as the empty option, e.g. "All themes". */
  anyLabel: string;
  options: FilterOption[];
}

/**
 * Filter controls that live in the query string, so a filtered view is a URL a consultant can send
 * to a colleague and the server does the filtering rather than hiding rows in the browser. Every
 * other parameter on the URL is preserved — including `preview=1` on the portal.
 */
export function FilterBar({ filters }: { filters: FilterSpec[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const apply = (param: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === '') next.delete(param);
    else next.set(param, value);
    const query = next.toString();
    router.push(query === '' ? pathname : `${pathname}?${query}`);
  };

  const active = filters.filter((filter) => (searchParams.get(filter.param) ?? '') !== '');

  return (
    <div className="flex flex-wrap items-end gap-3 no-print">
      {filters.map((filter) => (
        <label key={filter.param} className="block">
          <span className="label block mb-1.5">{filter.label}</span>
          <Select
            data-testid={`filter-${filter.param}`}
            value={searchParams.get(filter.param) ?? ''}
            onChange={(event) => apply(filter.param, event.target.value)}
            className="min-w-[190px]"
          >
            <option value="">{filter.anyLabel}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      ))}
      {active.length > 0 ? (
        <button
          type="button"
          data-testid="filter-clear"
          onClick={() => router.push(pathname)}
          className="label pb-2 hover:text-[var(--color-ink)]"
        >
          Clear {active.length} filter{active.length === 1 ? '' : 's'}
        </button>
      ) : null}
    </div>
  );
}
