import Link from 'next/link';

import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  SectionHeader,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ui';
import { formatDateTime, requireWorkspace } from '@/lib/page';
import { DEFAULT_SELECTION } from '@/lib/publish';
import type { PublishSelection } from '@/lib/types';

import { PublishForm } from './PublishForm';

export const metadata = { title: 'Publish — Conductor' };

const SELECTION_LABELS: Record<keyof PublishSelection, string> = {
  includeCurrentState: 'Current state',
  includeMaturityHeatmap: 'Maturity heatmap',
  includeOpportunities: 'Opportunities',
  includeInitiatives: 'Initiatives',
  includeRoadmap: 'Roadmap',
  includeDecisions: 'Decisions',
  includeScores: 'Scores',
  allowComments: 'Comments',
  allowRanking: 'Ranking',
  allowDependencySuggestions: 'Dependency suggestions',
  allowTimingFeedback: 'Timing feedback',
};

export default async function PublishPage() {
  const { view } = await requireWorkspace();
  const latest = view.latestSnapshot;
  const nextVersion = (view.engagement.publishedVersion ?? 0) + 1;
  const snapshots = view.allSnapshots;

  // Default the next publication to everything, which is the point of the demo's second version.
  const initialSelection: PublishSelection = { ...DEFAULT_SELECTION };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Phase 6 · Business alignment"
        title="Publish"
        description="The client portal reads only from a published snapshot. Choose what to include and what the client may do with it; publishing writes a frozen copy at the next version number."
        action={
          <Link
            href="/portal?preview=1"
            className="label hover:text-[var(--color-ink)] whitespace-nowrap"
          >
            Preview the portal
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Published version"
          value={view.engagement.publishedVersion ?? '—'}
          hint={latest ? `Published ${formatDateTime(latest.publishedAt)} by ${latest.publishedBy}` : 'Nothing published yet'}
        />
        <StatCard
          label="In the current version"
          value={latest ? latest.payload.opportunities.length : 0}
          hint={
            latest
              ? `${latest.payload.initiatives.length} initiatives, ${latest.payload.waves.length} waves`
              : undefined
          }
        />
        <StatCard label="Next version" value={nextVersion} tone="amber" />
      </div>

      <Card>
        <h3 className="text-[17px] mb-1">Publish version {nextVersion}</h3>
        <p className="text-[13.5px] text-[var(--color-slate)] mb-5 max-w-[80ch]">
          Version {view.engagement.publishedVersion ?? 0} deliberately left out the roadmap and the
          initiatives. Ticking them here is what makes the sequencing visible to the client for the
          first time.
        </p>
        <PublishForm
          engagementId={view.engagement.id}
          nextVersion={nextVersion}
          initialSelection={initialSelection}
        />
      </Card>

      {latest ? (
        <Card flush>
          <CardHeader
            title={`Version ${latest.version} — what the client can see now`}
            hint={latest.note || 'No note was recorded with this version.'}
          />
          <div className="px-5 py-4 flex flex-wrap gap-1.5">
            {(Object.keys(SELECTION_LABELS) as (keyof PublishSelection)[]).map((key) => (
              <Badge key={key} tone={latest.selection[key] ? 'positive' : 'lower'}>
                {latest.selection[key] ? '' : 'no '}
                {SELECTION_LABELS[key]}
              </Badge>
            ))}
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Content</TH>
                <TH align="right">Records in the snapshot</TH>
              </TR>
            </THead>
            <TBody>
              {[
                ['Findings', latest.payload.findings.length],
                ['Maturity focus areas', latest.payload.maturityFocusAreas.length],
                ['Opportunities', latest.payload.opportunities.length],
                ['Opportunity scores', latest.payload.opportunityScores.length],
                ['Initiatives', latest.payload.initiatives.length],
                ['Waves', latest.payload.waves.length],
                ['Dependencies', latest.payload.dependencies.length],
                ['Decisions', latest.payload.decisions.length],
              ].map(([label, count]) => (
                <TR key={String(label)}>
                  <TD>{label}</TD>
                  <TD align="right" className="tabular">
                    {count}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          title="Nothing published yet"
          description="The client portal will stay empty until the first version is published."
        />
      )}

      <Card flush>
        <CardHeader title="Version history" hint="Every published version is kept." />
        <Table>
          <THead>
            <TR>
              <TH>Version</TH>
              <TH>Published</TH>
              <TH>By</TH>
              <TH>Note</TH>
            </TR>
          </THead>
          <TBody>
            {snapshots.map((snapshot) => (
              <TR key={snapshot.version}>
                <TD className="tabular font-medium">v{snapshot.version}</TD>
                <TD className="text-[13px] text-[var(--color-slate)]">
                  {formatDateTime(snapshot.publishedAt)}
                </TD>
                <TD className="text-[13px]">{snapshot.publishedBy}</TD>
                <TD className="text-[13px] text-[var(--color-slate)] max-w-[60ch]">
                  {snapshot.note || '—'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
