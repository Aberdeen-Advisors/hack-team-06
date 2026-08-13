import Link from 'next/link';

import {
  BandBadge,
  Badge,
  Card,
  CardHeader,
  SectionHeader,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ui';
import { formatDate, requireWorkspace } from '@/lib/page';
import { ENGAGEMENT_PHASES } from '@/lib/types';

export default async function WorkspaceOverviewPage() {
  const { user, view } = await requireWorkspace();
  const phase = ENGAGEMENT_PHASES.find((p) => p.key === view.engagement.phase);
  const critical = view.opportunityRows.filter((r) => r.derived?.band === 'Critical');
  const pendingSubmissions = view.submissions.filter((s) => s.status === 'pending');
  const proposedSuggestions = view.aiSuggestions.filter((s) => s.status === 'proposed');
  const assessed = view.maturityRows.filter((r) => r.focusArea.currentLevel !== null).length;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={`${view.engagement.clientName} · Phase ${phase?.sequence ?? '—'} of 8 · ${phase?.label ?? view.engagement.phase}`}
        title={view.engagement.name}
        description={`Welcome back, ${user.name.split(' ')[0]}. Started ${formatDate(view.engagement.startedAt)}. Published version ${view.engagement.publishedVersion ?? 'none'} to the client portal.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Opportunities scored"
          value={`${view.opportunityRows.filter((r) => r.derived).length}/${view.opportunities.length}`}
          hint={`${critical.length} in the Critical band`}
        />
        <StatCard
          label="Initiatives"
          value={view.initiatives.length}
          hint={`${view.initiativeRows.filter((r) => r.wave === null).length} not yet on the roadmap`}
        />
        <StatCard
          label="Feasibility issues"
          value={view.feasibility.length}
          tone={view.feasibility.length > 0 ? 'critical' : 'default'}
          hint={
            view.feasibility.length > 0
              ? `${view.feasibility.filter((i) => i.severity === 'high').length} high severity`
              : 'The current plan is internally consistent'
          }
        />
        <StatCard
          label="Awaiting a decision"
          value={proposedSuggestions.length + pendingSubmissions.length}
          tone="amber"
          hint={`${proposedSuggestions.length} AI suggestions, ${pendingSubmissions.length} client submissions`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card flush>
          <CardHeader
            title="Portfolio by theme"
            hint="Theme membership is derived through each opportunity's initiative — an opportunity never carries a theme of its own."
          />
          <Table>
            <THead>
              <TR>
                <TH>Theme</TH>
                <TH align="right">Opportunities</TH>
                <TH align="right">Share</TH>
                <TH align="right">Mean score</TH>
                <TH>Bands</TH>
              </TR>
            </THead>
            <TBody>
              {view.themePortfolio.map((row) => (
                <TR key={row.themeId}>
                  <TD className="font-medium">{row.themeName}</TD>
                  <TD align="right" className="tabular">
                    {row.opportunityCount}
                  </TD>
                  <TD align="right" className="tabular">
                    {row.sharePct}%
                  </TD>
                  <TD align="right" className="tabular">
                    {row.meanWeighted?.toFixed(2) ?? '—'}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          ['Critical', row.countByBand.Critical],
                          ['High Priority', row.countByBand['High Priority']],
                          ['Medium Priority', row.countByBand['Medium Priority']],
                          ['Lower Priority', row.countByBand['Lower Priority']],
                        ] as const
                      )
                        .filter(([, count]) => count > 0)
                        .map(([band, count]) => (
                          <span key={band} className="inline-flex items-center gap-1">
                            <BandBadge band={band} />
                            <span className="tabular text-[12px] text-[var(--color-slate)]">
                              {count}
                            </span>
                          </span>
                        ))}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card flush>
          <CardHeader
            title="Quadrant population"
            hint="Business value averages strategic alignment with financial impact; urgency is risk if deferred."
          />
          <Table>
            <THead>
              <TR>
                <TH>Quadrant</TH>
                <TH align="right">Opportunities</TH>
              </TR>
            </THead>
            <TBody>
              {(
                ['Act Now', 'Defend', 'Plan & Fund', 'Sequence Later'] as const
              ).map((quadrant) => (
                <TR key={quadrant}>
                  <TD>{quadrant}</TD>
                  <TD align="right" className="tabular">
                    {view.quadrants.counts[quadrant]}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {view.quadrants.notes.length > 0 ? (
            <div className="px-5 py-4 border-t border-[var(--color-line)] bg-[var(--color-amber-soft)]/50">
              {view.quadrants.notes.map((note) => (
                <p key={note} className="text-[12.5px] text-[var(--color-ink-soft)]">
                  {note}
                </p>
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      <Card flush>
        <CardHeader
          title="Critical band"
          hint={`${critical.length} opportunities scoring at or above ${view.scoringModel.bands[0].min}.`}
          action={
            <Link href="/workspace/opportunities" className="label hover:text-[var(--color-ink)]">
              Full register
            </Link>
          }
        />
        <Table>
          <THead>
            <TR>
              <TH width="90px">Code</TH>
              <TH>Opportunity</TH>
              <TH>Theme</TH>
              <TH align="right">Weighted</TH>
              <TH>Band</TH>
              <TH>Quadrant</TH>
              <TH align="right">Client rank</TH>
            </TR>
          </THead>
          <TBody>
            {critical.map((row) => (
              <TR key={row.opportunity.id}>
                <TD className="tabular text-[var(--color-slate)]">{row.opportunity.displayCode}</TD>
                <TD className="font-medium">{row.opportunity.title}</TD>
                <TD className="text-[var(--color-slate)]">{row.theme?.name ?? '—'}</TD>
                <TD align="right" className="tabular">
                  {row.derived?.weighted.toFixed(2)}
                </TD>
                <TD>
                  <BandBadge band={row.derived?.band ?? null} />
                </TD>
                <TD>
                  <Badge tone="slate">{row.derived?.quadrant}</Badge>
                </TD>
                <TD align="right" className="tabular">
                  {row.opportunity.clientRank ?? '—'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card flush>
          <CardHeader
            title="Needs attention"
            hint="Feasibility issues in the current plan, each with the smallest change that resolves it."
            action={
              <Link href="/workspace/roadmap" className="label hover:text-[var(--color-ink)]">
                Roadmap
              </Link>
            }
          />
          <ul className="divide-y divide-[var(--color-line)]">
            {view.feasibility.map((issue, index) => (
              <li key={`${issue.type}-${issue.initiativeId}-${index}`} className="px-5 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={issue.severity === 'high' ? 'critical' : 'amber'}>
                    {issue.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-[13.5px]">{issue.message}</p>
                <p className="text-[13px] text-[var(--color-slate)] mt-1">{issue.resolution}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card flush>
          <CardHeader
            title="Assessment coverage"
            hint="Unassessed focus areas are excluded from every mean, never counted as zero."
            action={
              <Link href="/workspace/maturity" className="label hover:text-[var(--color-ink)]">
                Maturity
              </Link>
            }
          />
          <div className="px-5 py-4 grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Focus areas assessed"
              value={`${assessed}/${view.maturityRows.length}`}
              hint={`${view.maturityRows.filter((r) => r.focusArea.insufficientEvidence).length} marked insufficient evidence`}
            />
            <StatCard
              label="Evidence records"
              value={view.evidence.length}
              hint={`${view.findings.length} findings across ${view.capabilityAreas.length} capability areas`}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
