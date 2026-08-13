import {
  Badge,
  BandBadge,
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
import { requireWorkspace } from '@/lib/page';

export const metadata = { title: 'Initiatives — Conductor' };

export default async function InitiativesPage() {
  const { view } = await requireWorkspace();

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Phase 4 · Initiatives"
        title="Initiatives"
        description="Initiatives group the opportunity register into fundable, ownable pieces of work. Each rollup is the mean of its opportunities' weighted scores, banded on that mean, sized by the largest thing inside it."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Initiatives" value={view.initiatives.length} />
        <StatCard label="Themes" value={view.themes.length} />
        <StatCard
          label="Without an owner"
          value={view.initiatives.filter((i) => i.owner.trim() === '').length}
          tone="critical"
        />
        <StatCard
          label="Not on the roadmap"
          value={view.initiativeRows.filter((r) => r.wave === null).length}
          tone="amber"
        />
      </div>

      {view.themes.map((theme) => {
        const rows = view.initiativeRows.filter((r) => r.initiative.themeId === theme.id);
        const portfolio = view.themePortfolio.find((t) => t.themeId === theme.id);
        return (
          <Card key={theme.id} flush>
            <CardHeader
              title={`${theme.sequence}. ${theme.name}`}
              hint={`${theme.description} — ${portfolio?.opportunityCount ?? 0} opportunities, ${portfolio?.sharePct ?? 0}% of the register.`}
            />
            <Table>
              <THead>
                <TR>
                  <TH>Initiative</TH>
                  <TH>Owner</TH>
                  <TH>Workstream</TH>
                  <TH>Wave</TH>
                  <TH align="center">Size</TH>
                  <TH align="right">Opportunities</TH>
                  <TH align="right">Mean score</TH>
                  <TH>Band</TH>
                  <TH align="right">Best rank</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.initiative.id}>
                    <TD>
                      <p className="font-medium">{row.initiative.name}</p>
                      <p className="text-[12.5px] text-[var(--color-slate)] mt-0.5 max-w-[58ch]">
                        {row.initiative.targetOutcome}
                      </p>
                    </TD>
                    <TD className="text-[13px]">
                      {row.initiative.owner.trim() === '' ? (
                        <Badge tone="critical">No owner</Badge>
                      ) : (
                        row.initiative.owner
                      )}
                    </TD>
                    <TD className="text-[13px] text-[var(--color-slate)]">
                      {row.initiative.workstream}
                    </TD>
                    <TD className="text-[13px]">
                      {row.wave ? (
                        row.wave.label
                      ) : (
                        <Badge tone="amber">Unassigned</Badge>
                      )}
                    </TD>
                    <TD align="center">
                      <Badge tone="neutral">{row.rollup.maxTShirtSize ?? '—'}</Badge>
                    </TD>
                    <TD align="right" className="tabular">
                      {row.rollup.opportunityCount}
                    </TD>
                    <TD align="right" className="tabular font-medium">
                      {row.rollup.meanWeighted?.toFixed(2) ?? '—'}
                    </TD>
                    <TD>
                      <BandBadge band={row.rollup.band} />
                    </TD>
                    <TD align="right" className="tabular">
                      {row.rollup.bestClientRank ?? '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        );
      })}
    </div>
  );
}
