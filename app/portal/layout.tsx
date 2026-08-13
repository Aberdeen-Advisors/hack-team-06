import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { PortalNav } from '@/components/PortalNav';
import { PreviewBanner } from '@/components/PreviewBanner';
import { SignOutButton } from '@/components/SignOutButton';
import { ToastProvider } from '@/components/ui';
import { getSession } from '@/lib/auth';
import { formatDate } from '@/lib/page';
import { latestSnapshot } from '@/lib/publish';
import { getDb } from '@/lib/store';
import { primaryEngagementId } from '@/lib/view';

export const metadata = { title: 'Client Portal — Conductor' };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login?next=%2Fportal');

  const engagementId = primaryEngagementId(session.user.engagementIds);
  if (!engagementId) redirect('/login');
  const snapshot = latestSnapshot(getDb(), engagementId);
  const clientName = snapshot?.payload.engagement.clientName ?? 'Your engagement';

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        {session.role === 'aberdeen' ? (
          <PreviewBanner publishedVersion={snapshot?.version ?? null} />
        ) : null}

        <header className="border-b border-[var(--color-line)] bg-white">
          <div className="mx-auto max-w-[1180px] px-8 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
              <div className="flex items-baseline gap-3">
                <Link href="/portal" className="font-serif text-[19px]">
                  Conductor
                </Link>
                <span className="label">{clientName} · Aberdeen Advisors</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[var(--color-slate)]">
                  {session.user.name}
                  <span className="text-[var(--color-slate-light)]"> · {session.user.title}</span>
                </span>
                <SignOutButton />
              </div>
            </div>
            <Suspense fallback={null}>
              <PortalNav />
            </Suspense>
          </div>
        </header>

        <div className="bg-[var(--color-ink)] text-white">
          <div className="mx-auto max-w-[1180px] px-8 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="label text-white/70">
              {snapshot ? `Published version ${snapshot.version}` : 'Nothing published yet'}
            </span>
            <span className="text-[13px] text-white/80">
              {snapshot
                ? `${formatDate(snapshot.publishedAt)} · published by ${snapshot.publishedBy}`
                : 'Your advisory team has not published a version of the roadmap yet.'}
            </span>
            {snapshot?.note ? (
              <span className="text-[13px] text-white/60 max-w-[70ch]">{snapshot.note}</span>
            ) : null}
          </div>
        </div>

        <main className="grow px-8 py-9">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>

        <footer className="border-t border-[var(--color-line)] bg-white">
          <div className="mx-auto max-w-[1180px] px-8 py-4 text-[12.5px] text-[var(--color-slate)]">
            This portal shows a published version of the working analysis, not live working data.
            Anything your advisory team changes appears here only when they publish the next version.
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
