import {
  Badge,
  BandBadge,
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
import { requirePortal } from '@/lib/page';

export default async function PortalOverviewPage() {
  const { snapshot } = await requirePortal();

  if (!snapshot) {
    return (
      <EmptyState
        title="Nothing has been published yet"
        description="Your advisory team is still working on the analysis. This portal will fill in as soon as they publish a version."
      />
    );
  }

  const payload = snapshot.payload;
  const derivedByOpp = new Map(payload.derived.opportunities.map((d) => [d.opportunityId, d]));
  const ranked = payload.opportunities
    .filter((o) => o.clientRank !== null)
    .sort((a, b) => (a.clientRank ?? 0) - (b.clientRank ?? 0));
  const top = [...payload.opportunities]
    .sort(
      (a, b) =>
        (derivedByOpp.get(b.id)?.weighted ?? 0) - (derivedByOpp.get(a.id)?.weighted ?? 0),
    )
    .slice(0, 12);
  const capById = new Map(payload.capabilityAreas.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={`Published version ${snapshot.version}`}
        title={payload.engagement.name}
        description="What follows is the analysis as published, including the numbers exactly as they stood when this version was released."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Opportunities" value={payload.opportunities.length} />
        <StatCard label="Themes" value={payload.themes.length} />
        <StatCard label="Findings" value={payload.findings.length} />
        <StatCard label="Decisions recorded" value={payload.decisions.length} />
      </div>

      {payload.derived.themes.length > 0 ? (
        <Card flush>
          <CardHeader title="Where the work sits" hint="Opportunities grouped by theme." />
          <Table>
            <THead>
              <TR>
                <TH>Theme</TH>
                <TH>What it is for</TH>
                <TH align="right">Opportunities</TH>
                <TH align="right">Share</TH>
              </TR>
            </THead>
            <TBody>
              {payload.themes.map((theme) => {
                const derived = payload.derived.themes.find((t) => t.themeId === theme.id);
                return (
                  <TR key={theme.id}>
                    <TD className="font-medium">{theme.name}</TD>
                    <TD className="text-[13px] text-[var(--color-slate)] max-w-[60ch]">
                      {theme.description}
                    </TD>
                    <TD align="right" className="tabular">
                      {derived?.opportunityCount ?? 0}
                    </TD>
                    <TD align="right" className="tabular">
                      {derived?.sharePct ?? 0}%
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ) : null}

      {payload.opportunities.length > 0 ? (
        <Card flush>
          <CardHeader
            title="Highest priority opportunities"
            hint={
              snapshot.selection.includeScores
                ? 'Ranked by the weighted priority score in this published version.'
                : 'Scores were not included in this version.'
            }
          />
          <Table>
            <THead>
              <TR>
                <TH width="86px">Code</TH>
                <TH>Opportunity</TH>
                <TH>Capability area</TH>
                {snapshot.selection.includeScores ? <TH align="right">Score</TH> : null}
                {snapshot.selection.includeScores ? <TH>Priority</TH> : null}
                <TH align="right">Your rank</TH>
              </TR>
            </THead>
            <TBody>
              {top.map((opportunity) => {
                const derived = derivedByOpp.get(opportunity.id);
                return (
                  <TR key={opportunity.id}>
                    <TD className="tabular text-[var(--color-slate)]">
                      {opportunity.displayCode}
                    </TD>
                    <TD>
                      <p className="font-medium">{opportunity.title}</p>
                      <p className="text-[12.5px] text-[var(--color-slate)] mt-0.5 max-w-[62ch]">
                        {opportunity.description}
                      </p>
                    </TD>
                    <TD className="text-[13px] text-[var(--color-slate)]">
                      {capById.get(opportunity.capabilityAreaId)?.name ?? '—'}
                    </TD>
                    {snapshot.selection.includeScores ? (
                      <TD align="right" className="tabular">
                        {derived?.weighted?.toFixed(2) ?? '—'}
                      </TD>
                    ) : null}
                    {snapshot.selection.includeScores ? (
                      <TD>
                        <BandBadge band={derived?.band ?? null} />
                      </TD>
                    ) : null}
                    <TD align="right" className="tabular">
                      {opportunity.clientRank ?? '—'}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ) : null}

      {ranked.length > 0 ? (
        <Card>
          <h3 className="text-[17px] mb-1">Your ranking</h3>
          <p className="text-[13.5px] text-[var(--color-slate)] mb-4">
            The opportunities your team has ranked, in your order rather than ours.
          </p>
          <ol className="space-y-1.5">
            {ranked.map((opportunity) => (
              <li key={opportunity.id} className="flex items-baseline gap-3 text-[14px]">
                <span className="tabular font-serif text-[16px] w-6">{opportunity.clientRank}</span>
                <span className="font-medium">{opportunity.title}</span>
                <Badge tone="neutral">{opportunity.displayCode}</Badge>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
