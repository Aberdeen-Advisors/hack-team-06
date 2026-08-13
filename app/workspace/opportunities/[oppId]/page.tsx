import Link from 'next/link';
import { notFound } from 'next/navigation';

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
import { DIMENSION_KEYS } from '@/lib/types';
import type { AnchorScore, DimensionKey } from '@/lib/types';

import { ScoreForm } from './ScoreForm';

export const metadata = { title: 'Scoring — Conductor' };

const CURRENT_BY_KEY: Record<DimensionKey, 'financialImpact' | 'riskIfDeferred' | 'strategicAlignment'> =
  {
    financial_impact: 'financialImpact',
    risk_if_deferred: 'riskIfDeferred',
    strategic_alignment: 'strategicAlignment',
  };

export default async function OpportunityScoringPage({
  params,
}: {
  params: Promise<{ oppId: string }>;
}) {
  const { oppId } = await params;
  const { view } = await requireWorkspace();
  const row = view.opportunityRows.find((r) => r.opportunity.id === oppId);
  if (!row) notFound();

  const model = view.scoringModel;
  const { opportunity, score, derived } = row;
  const initial = {
    financial_impact: (score?.financialImpact ?? 3) as AnchorScore,
    risk_if_deferred: (score?.riskIfDeferred ?? 3) as AnchorScore,
    strategic_alignment: (score?.strategicAlignment ?? 3) as AnchorScore,
  };
  const initialRationale = {
    financial_impact: score?.rationale.financial_impact ?? '',
    risk_if_deferred: score?.rationale.risk_if_deferred ?? '',
    strategic_alignment: score?.rationale.strategic_alignment ?? '',
  };
  const evidenceById = new Map(view.evidence.map((e) => [e.id, e]));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={`Phase 4 · Scoring · ${opportunity.displayCode}`}
        title={opportunity.title}
        description={opportunity.description}
        action={
          <Link href="/workspace/opportunities" className="label hover:text-[var(--color-ink)]">
            Back to the register
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Weighted score"
          value={derived ? derived.weighted.toFixed(2) : '—'}
          hint={model.name}
        />
        <div className="border border-[var(--color-line)] bg-white rounded-[3px] px-4 py-3.5">
          <p className="label">Priority band</p>
          <div className="mt-2" data-testid="derived-band">
            <BandBadge band={derived?.band ?? null} />
          </div>
        </div>
        <div className="border border-[var(--color-line)] bg-white rounded-[3px] px-4 py-3.5">
          <p className="label">Quadrant</p>
          <div className="mt-2" data-testid="derived-quadrant">
            <QuadrantBadge quadrant={derived?.quadrant ?? null} />
          </div>
        </div>
        <StatCard
          label="Business value axis"
          value={derived ? derived.businessValue.toFixed(2) : '—'}
          hint={`Threshold ${model.quadrantThreshold}`}
        />
        <StatCard
          label="Urgency axis"
          value={derived ? derived.urgency.toFixed(2) : '—'}
          hint={`Threshold ${model.quadrantThreshold}`}
        />
      </div>

      <Card>
        <h3 className="text-[17px] mb-1">Score against the anchors</h3>
        <p className="text-[13.5px] text-[var(--color-slate)] mb-5 max-w-[86ch]">
          Each dimension is scored 1–5 against the rubric below, never as a free number. Saving
          rescores the opportunity and everything derived from it — the register, the initiative
          rollup, the theme portfolio and the quadrant — follows on the next read.
        </p>
        <ScoreForm
          engagementId={view.engagement.id}
          opportunityId={opportunity.id}
          dimensions={model.dimensions.map((d) => ({
            key: d.key,
            label: d.label,
            weight: d.weight,
            anchors: d.anchors,
          }))}
          initial={initial}
          initialRationale={initialRationale}
        />
      </Card>

      <Card flush>
        <CardHeader
          title="Anchor rubric"
          hint={`${model.name}, version ${model.version}. Weights sum to 1.0. The score currently held for this opportunity is marked on each row.`}
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
            {model.dimensions.map((dimension) => {
              const current = score ? score[CURRENT_BY_KEY[dimension.key]] : null;
              return (
                <TR key={dimension.key}>
                  <TD className="font-medium whitespace-nowrap">
                    {dimension.label}
                    {current !== null ? (
                      <span className="block mt-1">
                        <Badge tone="ink">Scored {current}</Badge>
                      </span>
                    ) : null}
                  </TD>
                  <TD align="right" className="tabular">
                    {(dimension.weight * 100).toFixed(0)}%
                  </TD>
                  {[5, 4, 3, 2, 1].map((value) => {
                    const anchor = dimension.anchors.find((a) => a.score === value);
                    return (
                      <TD
                        key={value}
                        className={`text-[12.5px] ${current === value ? 'bg-[var(--color-canvas-deep)]' : ''}`}
                      >
                        <span className="font-medium">{anchor?.label}</span>
                        <span className="block text-[var(--color-slate)]">{anchor?.definition}</span>
                      </TD>
                    );
                  })}
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <CardHeader
          title="Rationale and evidence"
          hint="Every score names the evidence behind it, so the register can be defended line by line."
        />
        <Table>
          <THead>
            <TR>
              <TH>Dimension</TH>
              <TH>Rationale on record</TH>
              <TH>Evidence cited</TH>
            </TR>
          </THead>
          <TBody>
            {DIMENSION_KEYS.map((key) => {
              const cited = (score?.evidenceIds[key] ?? [])
                .map((id) => evidenceById.get(id))
                .filter((e) => e !== undefined);
              return (
                <TR key={key}>
                  <TD className="font-medium whitespace-nowrap">
                    {model.dimensions.find((d) => d.key === key)?.label ?? key}
                  </TD>
                  <TD className="text-[13px] text-[var(--color-slate)] max-w-[60ch]">
                    {score?.rationale[key] || '—'}
                  </TD>
                  <TD className="text-[13px]">
                    {cited.length === 0 ? (
                      <span className="text-[var(--color-slate-light)]">None cited</span>
                    ) : (
                      <ul className="space-y-1.5">
                        {cited.map((e) => (
                          <li key={e.id}>
                            <span className="font-medium">{e.sourceLabel}</span>
                            <span className="block text-[12.5px] text-[var(--color-slate)]">
                              {e.locator} — &ldquo;{e.quote}&rdquo;
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <div className="px-5 py-3.5 border-t border-[var(--color-line)] text-[12.5px] text-[var(--color-slate)]">
          Scored by {score?.scoredBy ?? 'nobody yet'}
          {score ? ` · initiative: ${row.initiative?.name ?? '—'} · theme: ${row.theme?.name ?? '—'}` : ''}
        </div>
      </Card>
    </div>
  );
}
