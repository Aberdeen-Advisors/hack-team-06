import Link from 'next/link';

export const metadata = { title: 'Not found — Conductor' };

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-8 py-16">
      <div className="max-w-[60ch]">
        <p className="label mb-2">404</p>
        <h1 className="text-[26px] mb-3">That page is not part of this engagement</h1>
        <p className="text-[14px] text-[var(--color-slate)] mb-6">
          The link may be out of date, or the record it pointed at may have been renamed. Nothing has
          been lost — go back to where you were working and pick it up from there.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link href="/workspace" className="label hover:text-[var(--color-ink)]">
            Aberdeen workspace
          </Link>
          <Link href="/portal" className="label hover:text-[var(--color-ink)]">
            Client portal
          </Link>
          <Link href="/login" className="label hover:text-[var(--color-ink)]">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
