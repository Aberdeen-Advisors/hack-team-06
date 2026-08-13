import {
  Badge,
  BandBadge,
  Card,
  CardHeader,
  QuadrantBadge,
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
import { BAND_LABELS } from '@/lib/types';

export const metadata = { title: 'Opportunities — Conductor' };

export default async function OpportunitiesPage() {
  const { view } = await requireWorkspace();
  const model = view.scoringModel;
  const rows = [...view.opportunityRows].sort(
    (a, b) => (b.derived?.weighted ?? 0) - (a.derived?.weighted ?? 0),
  );
  const countByBand = BAND_LABELS.map((band) => ({
    band,
    count: rows.filter((r) => r.derived?.band === band).length,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Phase 4 · Opportunity register"
        title="Opportunities"
        description={`${rows.length} opportunities scored against ${model.name}. Only the three integer dimension scores are stored; the weighted score, band, axes and quadrant are recomputed on every read, so they can never drift from the inputs.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {countByBand.map(({ band, count }) => (
          <StatCard
            key={band}
            label={band}
            value={count}
            tone={band === 'Critical' ? 'critical' : band === 'High Priority' ? 'amber' : 'default'}
            hint={`${Math.round((count / rows.length) * 100)}% of the register`}
          />
        ))}
      </div>

      <Card flush>
        <CardHeader
          title="Scoring model"
          hint={`${model.name}, version ${model.version}. Weights sum to 1.0; bands are inclusive lower bounds; the quadrant threshold is ${model.quadrantThreshold} on both axes.`}
        />
        <Table>
          <THead>
            <TR>
              <TH>Dimension</TH>
              <TH align="right">Weight</TH>
              <TH>5</TH>
              <TH>4</TH>
              <TH>3</TH>
              <TH>2</TH>
              <TH>1</TH>
            </TR>
          </THead>
          <TBody>
            {model.dimensions.map((dimension) => (
              <TR key={dimension.key}>
                <TD className="font-medium whitespace-nowrap">{dimension.label}</TD>
                <TD align="right" className="tabular">
                  {(dimension.weight * 100).toFixed(0)}%
                </TD>
                {[5, 4, 3, 2, 1].map((score) => {
                  const anchor = dimension.anchors.find((a) => a.score === score);
                  return (
                    <TD key={score} className="text-[12.5px]">
                      <span className="font-medium">{anchor?.label}</span>
                      <span className="block text-[var(--color-slate)]">{anchor?.definition}</span>
                    </TD>
                  );
                })}
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <CardHeader
          title="Register"
          hint="Sorted by weighted score. Theme is derived through the initiative."
        />
        <Table>
          <THead>
            <TR>
              <TH width="86px">Code</TH>
              <TH>Opportunity</TH>
              <TH>Initiative</TH>
              <TH>Theme</TH>
              <TH align="center">FI</TH>
              <TH align="center">RD</TH>
              <TH align="center">SA</TH>
              <TH align="right">Weighted</TH>
              <TH>Band</TH>
              <TH>Quadrant</TH>
              <TH align="right">Rank</TH>
              <TH align="center">Size</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.opportunity.id}>
                <TD className="tabular text-[var(--color-slate)]">{row.opportunity.displayCode}</TD>
                <TD>
                  <p className="font-medium">{row.opportunity.title}</p>
                  <p className="text-[12.5px] text-[var(--color-slate)] mt-0.5 max-w-[54ch]">
                    {row.opportunity.description}
                  </p>
                </TD>
                <TD className="text-[13px] text-[var(--color-slate)]">
                  {row.initiative?.name ?? '—'}
                </TD>
                <TD className="text-[13px] text-[var(--color-slate)]">{row.theme?.name ?? '—'}</TD>
                <TD align="center" className="tabular">
                  {row.score?.financialImpact ?? '—'}
                </TD>
                <TD align="center" className="tabular">
                  {row.score?.riskIfDeferred ?? '—'}
                </TD>
                <TD align="center" className="tabular">
                  {row.score?.strategicAlignment ?? '—'}
                </TD>
                <TD align="right" className="tabular font-medium">
                  {row.derived?.weighted.toFixed(2) ?? '—'}
                </TD>
                <TD>
                  <BandBadge band={row.derived?.band ?? null} />
                </TD>
                <TD>
                  <QuadrantBadge quadrant={row.derived?.quadrant ?? null} />
                </TD>
                <TD align="right" className="tabular">
                  {row.opportunity.clientRank ?? '—'}
                </TD>
                <TD align="center">
                  <Badge tone="neutral">{row.opportunity.tShirtSize}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
