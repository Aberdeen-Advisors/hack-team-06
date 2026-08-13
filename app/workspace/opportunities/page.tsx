import Link from 'next/link';

import { FilterBar } from '@/components/FilterBar';
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
import type { BandLabel } from '@/lib/types';

export const metadata = { title: 'Opportunities — Conductor' };

/** `?theme=&area=&band=` — filtering happens on the server, so a filtered register is a URL. */
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { view } = await requireWorkspace();
  const query = await searchParams;
  const one = (key: string): string => {
    const value = query[key];
    return typeof value === 'string' ? value : '';
  };
  const themeFilter = one('theme');
  const areaFilter = one('area');
  const bandFilter = one('band');

  const model = view.scoringModel;
  const all = [...view.opportunityRows].sort(
    (a, b) => (b.derived?.weighted ?? 0) - (a.derived?.weighted ?? 0),
  );
  const rows = all.filter(
    (row) =>
      (themeFilter === '' || row.theme?.id === themeFilter) &&
      (areaFilter === '' || row.capabilityArea?.id === areaFilter) &&
      (bandFilter === '' || row.derived?.band === (bandFilter as BandLabel)),
  );
  const filtered = rows.length !== all.length;
  const countByBand = BAND_LABELS.map((band) => ({
    band,
    count: rows.filter((r) => r.derived?.band === band).length,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Phase 4 · Opportunity register"
        title="Opportunities"
        description={`${rows.length}${filtered ? ` of ${all.length}` : ''} opportunities scored against ${model.name}. Only the three integer dimension scores are stored; the weighted score, band, axes and quadrant are recomputed on every read, so they can never drift from the inputs.`}
      />

      <FilterBar
        filters={[
          {
            param: 'theme',
            label: 'Theme',
            anyLabel: 'All themes',
            options: view.themes.map((theme) => ({ value: theme.id, label: theme.name })),
          },
          {
            param: 'area',
            label: 'Capability area',
            anyLabel: 'All capability areas',
            options: view.capabilityAreas.map((area) => ({ value: area.id, label: area.name })),
          },
          {
            param: 'band',
            label: 'Priority band',
            anyLabel: 'All bands',
            options: BAND_LABELS.map((band) => ({ value: band, label: band })),
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {countByBand.map(({ band, count }) => (
          <StatCard
            key={band}
            label={band}
            value={count}
            tone={band === 'Critical' ? 'critical' : band === 'High Priority' ? 'amber' : 'default'}
            hint={
              rows.length === 0
                ? 'Nothing matches the filter'
                : `${Math.round((count / rows.length) * 100)}% of the ${filtered ? 'filtered ' : ''}register`
            }
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
          hint={`Sorted by weighted score. Theme is derived through the initiative. Open any row to score it against the anchor rubric.${filtered ? ` Filtered to ${rows.length} of ${all.length}.` : ''}`}
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
                <TD className="tabular text-[var(--color-slate)] whitespace-nowrap align-top">
                  <Link
                    href={`/workspace/opportunities/${row.opportunity.id}`}
                    className="underline decoration-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
                  >
                    {row.opportunity.displayCode}
                  </Link>
                </TD>
                <TD>
                  <p className="font-medium">
                    <Link
                      href={`/workspace/opportunities/${row.opportunity.id}`}
                      className="hover:underline"
                    >
                      {row.opportunity.title}
                    </Link>
                  </p>
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
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={12} className="text-center text-[var(--color-slate)] py-6">
                  No opportunity matches this filter. Clear it to see the whole register.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
