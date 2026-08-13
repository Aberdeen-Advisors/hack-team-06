import {
  Card,
  CardHeader,
  EmptyState,
  SectionHeader,
  StatCard,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ui';
import { formatDateTime, requirePortal, titleCase } from '@/lib/page';
import { getDb } from '@/lib/store';

import { FeedbackForm } from './FeedbackForm';

export default async function PortalFeedbackPage() {
  const { user, role, engagementId, snapshot } = await requirePortal();

  // A client sees only their own submissions; an Aberdeen preview sees the queue as a whole.
  const all = getDb().clientSubmissions.filter((s) => s.engagementId === engagementId);
  const mine = role === 'client' ? all.filter((s) => s.submittedBy === user.id) : all;

  const opportunities = (snapshot?.payload.opportunities ?? []).map((o) => ({
    id: o.id,
    label: `${o.displayCode} — ${o.title}`,
  }));
  const initiatives = (snapshot?.payload.initiatives ?? []).map((i) => ({
    id: i.id,
    label: i.name,
  }));
  const waves = (snapshot?.payload.waves ?? [])
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((w) => ({ id: w.id, label: w.label }));

  const targetLabel = (targetType: string, targetId: string | null): string => {
    if (!targetId) return titleCase(targetType);
    const opp = snapshot?.payload.opportunities.find((o) => o.id === targetId);
    if (opp) return `${opp.displayCode} ${opp.title}`;
    const init = snapshot?.payload.initiatives.find((i) => i.id === targetId);
    if (init) return init.name;
    return targetId;
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={snapshot ? `Published version ${snapshot.version}` : 'Not published'}
        title="My Feedback"
        description="Everything you have raised against a published version, and what your advisory team did with it."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Raised" value={mine.length} />
        <StatCard
          label="Awaiting response"
          value={mine.filter((s) => s.status === 'pending').length}
          tone="amber"
        />
        <StatCard
          label="Accepted and applied"
          value={mine.filter((s) => s.status === 'accepted').length}
        />
      </div>

      {snapshot === null ? (
        <EmptyState
          title="Nothing to respond to yet"
          description="Once a version is published you will be able to comment on it here."
        />
      ) : role !== 'client' ? (
        <Card>
          <h3 className="text-[17px] mb-1">Feedback controls are hidden in preview</h3>
          <p className="text-[13.5px] text-[var(--color-slate)] max-w-[80ch]">
            You are previewing the portal as an Aberdeen user. Raising feedback is restricted to
            client accounts server-side, so the forms are not shown here. Sign in as Dana Whitfield
            or Marcus Reed to use them.
          </p>
        </Card>
      ) : (
        <Card>
          <h3 className="text-[17px] mb-1">Raise something</h3>
          <p className="text-[13.5px] text-[var(--color-slate)] mb-5 max-w-[80ch]">
            What you send goes into your advisory team&rsquo;s review queue. If they accept it, the
            change is made in the working model and you will see it in the next published version.
          </p>
          <FeedbackForm
            engagementId={engagementId}
            opportunities={opportunities}
            initiatives={initiatives}
            waves={waves}
            allow={{
              comments: snapshot.selection.allowComments,
              ranking: snapshot.selection.allowRanking,
              timing: snapshot.selection.allowTimingFeedback,
              dependencies: snapshot.selection.allowDependencySuggestions,
            }}
          />
          {!snapshot.selection.allowComments &&
          !snapshot.selection.allowRanking &&
          !snapshot.selection.allowDependencySuggestions &&
          !snapshot.selection.allowTimingFeedback ? (
            <p className="text-[13.5px] text-[var(--color-slate)]">
              This version was published as read-only, so there is nothing to submit against it.
            </p>
          ) : null}
        </Card>
      )}

      {mine.length === 0 ? (
        <EmptyState
          title="You have not raised anything yet"
          description="Comments, rankings and timing requests you send will be listed here with their status."
        />
      ) : (
        <Card flush>
          <CardHeader
            title="What you have raised"
            hint="An accepted item names the change it made to the working model."
          />
          <Table>
            <THead>
              <TR>
                <TH>Kind</TH>
                <TH>About</TH>
                <TH>What you said</TH>
                <TH>Version</TH>
                <TH>Status</TH>
                <TH>Outcome</TH>
              </TR>
            </THead>
            <TBody>
              {mine.map((submission) => (
                <TR key={submission.id}>
                  <TD className="whitespace-nowrap">{titleCase(submission.kind)}</TD>
                  <TD className="text-[13px]">
                    {targetLabel(submission.targetType, submission.targetId)}
                  </TD>
                  <TD className="text-[13px] text-[var(--color-slate)] max-w-[46ch]">
                    {submission.body || '—'}
                  </TD>
                  <TD className="tabular text-[13px]">v{submission.snapshotVersion}</TD>
                  <TD>
                    <StatusBadge status={submission.status} />
                  </TD>
                  <TD className="text-[13px] max-w-[42ch]">
                    {submission.appliedChange ?? submission.reviewNote ?? (
                      <span className="text-[var(--color-slate-light)]">
                        Awaiting your advisory team
                      </span>
                    )}
                    {submission.reviewedAt ? (
                      <span className="block text-[12px] text-[var(--color-slate)]">
                        {formatDateTime(submission.reviewedAt)}
                      </span>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
