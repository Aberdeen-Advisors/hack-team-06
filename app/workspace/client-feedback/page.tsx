import {
  Badge,
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
import { formatDateTime, requireWorkspace, titleCase } from '@/lib/page';

import { SubmissionActions } from './SubmissionActions';

export const metadata = { title: 'Client Feedback — Conductor' };

export default async function ClientFeedbackPage() {
  const { view } = await requireWorkspace();
  const pending = view.submissions.filter((s) => s.status === 'pending');
  const reviewed = view.submissions.filter((s) => s.status !== 'pending');

  const targetLabel = (targetType: string, targetId: string | null): string => {
    if (!targetId) return titleCase(targetType);
    if (targetType === 'opportunity') {
      const opp = view.opportunities.find((o) => o.id === targetId);
      return opp ? `${opp.displayCode} ${opp.title}` : targetId;
    }
    if (targetType === 'initiative') {
      return view.initiatives.find((i) => i.id === targetId)?.name ?? targetId;
    }
    return titleCase(targetType);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Closing the loop"
        title="Client Feedback"
        description="What the client sent back against a published version. Accepting genuinely changes the working model — a ranking writes the client rank onto the opportunity, timing feedback moves the initiative's wave, a dependency suggestion creates the dependency — and records exactly what changed."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending review" value={pending.length} tone="amber" />
        <StatCard
          label="Accepted"
          value={view.submissions.filter((s) => s.status === 'accepted').length}
        />
        <StatCard
          label="Rejected"
          value={view.submissions.filter((s) => s.status === 'rejected').length}
        />
      </div>

      {pending.length === 0 ? (
        <EmptyState
          title="Nothing pending"
          description="Every piece of client feedback has been reviewed. Sign in as a client user and raise something from the portal to see the loop again."
        />
      ) : (
        <div className="space-y-5">
          {pending.map((submission) => (
            <Card key={submission.id} flush>
              <CardHeader
                title={`${titleCase(submission.kind)} — ${targetLabel(submission.targetType, submission.targetId)}`}
                hint={`${submission.submittedByName} · against published version ${submission.snapshotVersion} · ${formatDateTime(submission.submittedAt)}`}
                action={<StatusBadge status={submission.status} />}
              />
              <div className="px-5 py-4">
                {submission.body ? (
                  <p className="text-[14px] text-[var(--color-ink-soft)] max-w-[86ch]">
                    &ldquo;{submission.body}&rdquo;
                  </p>
                ) : null}
                {submission.payload !== null && typeof submission.payload === 'object' ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(submission.payload as Record<string, unknown>).map(
                      ([key, value]) => (
                        <Badge key={key} tone="slate">
                          {key.replace(/([A-Z])/g, ' $1')}: {String(value)}
                        </Badge>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
              <div className="px-5 py-3.5 border-t border-[var(--color-line)] bg-[var(--color-canvas)] no-print">
                <SubmissionActions
                  engagementId={view.engagement.id}
                  submissionId={submission.id}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {reviewed.length > 0 ? (
        <Card flush>
          <CardHeader
            title="Reviewed"
            hint="Each acceptance records the change it made to the working model."
          />
          <Table>
            <THead>
              <TR>
                <TH>Kind</TH>
                <TH>Target</TH>
                <TH>From</TH>
                <TH>Status</TH>
                <TH>What changed</TH>
                <TH>Reviewed</TH>
              </TR>
            </THead>
            <TBody>
              {reviewed.map((submission) => (
                <TR key={submission.id}>
                  <TD>{titleCase(submission.kind)}</TD>
                  <TD className="text-[13px]">
                    {targetLabel(submission.targetType, submission.targetId)}
                  </TD>
                  <TD className="text-[13px] text-[var(--color-slate)]">
                    {submission.submittedByName}
                  </TD>
                  <TD>
                    <StatusBadge status={submission.status} />
                  </TD>
                  <TD className="text-[13px] max-w-[52ch]">
                    {submission.appliedChange ?? '—'}
                    {submission.reviewNote ? (
                      <span className="block text-[12.5px] text-[var(--color-slate)]">
                        Note: {submission.reviewNote}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="text-[12.5px] text-[var(--color-slate)] whitespace-nowrap">
                    {submission.reviewedAt ? formatDateTime(submission.reviewedAt) : '—'}
                    {submission.reviewedBy ? ` · ${submission.reviewedBy}` : ''}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
