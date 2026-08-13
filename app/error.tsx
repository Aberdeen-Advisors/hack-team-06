'use client';

import Link from 'next/link';

/**
 * The top-level error boundary. It deliberately shows the error's `digest` rather than its message
 * or stack: a consultant seeing this in front of a client should get something they can quote to
 * whoever is on support, not an internal trace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-8 py-16">
      <div className="max-w-[62ch]">
        <p className="label mb-2">Something went wrong</p>
        <h1 className="text-[26px] mb-3">This screen could not be rendered</h1>
        <p className="text-[14px] text-[var(--color-slate)] mb-2">
          Nothing was saved and nothing was published. Try again; if it keeps happening, quote the
          reference below.
        </p>
        <p className="text-[13px] text-[var(--color-slate)] mb-6 tabular">
          Reference: {error.digest ?? 'not recorded'}
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center border border-[var(--color-ink)] bg-[var(--color-ink)] text-white rounded-[3px] px-3.5 py-1.5 text-[14px] font-medium hover:bg-[var(--color-ink-soft)]"
          >
            Try again
          </button>
          <Link href="/workspace" className="label hover:text-[var(--color-ink)]">
            Aberdeen workspace
          </Link>
          <Link href="/portal" className="label hover:text-[var(--color-ink)]">
            Client portal
          </Link>
        </div>
      </div>
    </main>
  );
}
