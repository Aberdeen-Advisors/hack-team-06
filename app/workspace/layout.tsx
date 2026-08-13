import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/SignOutButton';
import { WorkspaceNav } from '@/components/WorkspaceNav';
import { ToastProvider } from '@/components/ui';
import { getSession } from '@/lib/auth';
import { storageMode } from '@/lib/store';
import { buildEngagementView, primaryEngagementId } from '@/lib/view';

export const metadata = { title: 'Workspace — Conductor' };

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login?next=%2Fworkspace');
  if (session.role !== 'aberdeen') redirect('/portal');

  const engagementId = primaryEngagementId(session.user.engagementIds);
  const view = engagementId ? buildEngagementView(engagementId) : null;
  const pending = view?.submissions.filter((s) => s.status === 'pending').length ?? 0;
  const proposed = view?.aiSuggestions.filter((s) => s.status === 'proposed').length ?? 0;

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-[var(--color-line)] bg-white">
          <div className="px-8 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <Link href="/workspace" className="font-serif text-[19px]">
                Conductor
              </Link>
              <span className="label">Aberdeen Advisors</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[13px] text-[var(--color-slate)]">
                {session.user.name}
                <span className="text-[var(--color-slate-light)]"> · {session.user.title}</span>
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>

        <div className="flex grow">
          <aside className="w-[232px] shrink-0 border-r border-[var(--color-line)] bg-[var(--color-canvas-deep)]/40 py-6 no-print">
            {view ? (
              <div className="px-3 mb-5">
                <p className="label">Engagement</p>
                <p className="font-serif text-[16px] mt-1 leading-snug px-0">
                  {view.engagement.clientName}
                </p>
                <p className="text-[12px] text-[var(--color-slate)] mt-1">
                  Published version {view.engagement.publishedVersion ?? '—'} ·{' '}
                  {view.opportunities.length} opportunities
                </p>
              </div>
            ) : null}

            <WorkspaceNav />

            <div className="px-3 mt-6 space-y-1.5 text-[12px] text-[var(--color-slate)]">
              {proposed > 0 ? <p>{proposed} AI suggestions awaiting review</p> : null}
              {pending > 0 ? <p>{pending} client submissions pending</p> : null}
              <p className="text-[var(--color-slate-light)]">
                Storage: {storageMode() === 'file' ? 'file-backed' : 'in memory only'}
              </p>
            </div>
          </aside>

          <main className="grow min-w-0 px-8 py-8">
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
