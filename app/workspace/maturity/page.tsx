import {
  Badge,
  Card,
  CardHeader,
  LevelPill,
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
import { MATURITY_FRAMEWORKS } from '@/lib/types';

export const metadata = { title: 'Maturity — Conductor' };

export default async function MaturityPage() {
  const { view } = await requireWorkspace();
  const assessed = view.maturityRows.filter((r) => r.focusArea.currentLevel !== null).length;
  const insufficient = view.maturityRows.filter((r) => r.focusArea.insufficientEvidence);
  const recommended = MATURITY_FRAMEWORKS.find((f) => f.recommended) ?? MATURITY_FRAMEWORKS[0];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Phase 3 · Current state"
        title="Maturity Assessment"
        description={`Assessed against ${recommended.name}, ${recommended.levelCount} levels, per focus area. An unassessed area stays unassessed: it is excluded from every mean rather than counted as level one.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Focus areas assessed"
          value={`${assessed}/${view.maturityRows.length}`}
          hint={`across ${view.capabilityAreas.length} capability areas`}
        />
        <StatCard
          label="Insufficient evidence"
          value={insufficient.length}
          tone="amber"
          hint={insufficient.map((r) => r.focusArea.name).join('; ') || 'none'}
        />
        <StatCard
          label="Framework"
          value={recommended.levelCount}
          hint={`${recommended.name} (recommended default; ${MATURITY_FRAMEWORKS.length} available)`}
        />
      </div>

      <Card flush>
        <CardHeader
          title="Capability area rollup"
          hint="Means exclude unassessed focus areas. A gap is only shown where both current and target are set."
        />
        <Table>
          <THead>
            <TR>
              <TH>Capability area</TH>
              <TH align="right">Mean current</TH>
              <TH align="right">Mean target</TH>
              <TH align="right">Mean gap</TH>
              <TH align="right">Assessed</TH>
              <TH align="right">Findings</TH>
              <TH align="right">Opportunities</TH>
            </TR>
          </THead>
          <TBody>
            {view.capabilityAreaRows.map((row) => (
              <TR key={row.capabilityArea.id}>
                <TD className="font-medium">{row.capabilityArea.name}</TD>
                <TD align="right" className="tabular">
                  {row.maturity.meanCurrent?.toFixed(2) ?? '—'}
                </TD>
                <TD align="right" className="tabular">
                  {row.maturity.meanTarget?.toFixed(2) ?? '—'}
                </TD>
                <TD align="right" className="tabular">
                  {row.maturity.meanGap?.toFixed(2) ?? '—'}
                </TD>
                <TD align="right" className="tabular text-[var(--color-slate)]">
                  {row.maturity.countAssessed}/{row.maturity.countTotal}
                </TD>
                <TD align="right" className="tabular text-[var(--color-slate)]">
                  {row.findingCount}
                </TD>
                <TD align="right" className="tabular text-[var(--color-slate)]">
                  {row.opportunityCount}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <CardHeader
          title="Focus areas"
          hint={`${view.maturityRows.length} focus areas with their current and target level, the gap, and the rationale recorded for the rating.`}
        />
        <Table>
          <THead>
            <TR>
              <TH>Focus area</TH>
              <TH>Capability area</TH>
              <TH>Current</TH>
              <TH>Target</TH>
              <TH align="right">Gap</TH>
              <TH>Rationale</TH>
            </TR>
          </THead>
          <TBody>
            {view.maturityRows.map((row) => (
              <TR key={row.focusArea.id}>
                <TD className="font-medium">
                  {row.focusArea.name}
                  {row.focusArea.insufficientEvidence ? (
                    <Badge tone="amber" className="ml-2">
                      Insufficient evidence
                    </Badge>
                  ) : null}
                </TD>
                <TD className="text-[var(--color-slate)]">{row.capabilityArea?.name ?? '—'}</TD>
                <TD>
                  <LevelPill level={row.focusArea.currentLevel} kind="current" />
                </TD>
                <TD>
                  <LevelPill level={row.focusArea.targetLevel} kind="target" />
                </TD>
                <TD align="right" className="tabular">
                  {row.gap === null ? '—' : `+${row.gap}`}
                </TD>
                <TD className="text-[13px] text-[var(--color-slate)] max-w-[56ch]">
                  {row.focusArea.rationale}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <CardHeader
          title="Frameworks"
          hint="The ladder is selectable per engagement. CMMI is the recommended default."
        />
        <div className="px-5 py-4 grid gap-6 md:grid-cols-2">
          {MATURITY_FRAMEWORKS.map((framework) => (
            <div key={framework.id}>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-[15px]">{framework.name}</h4>
                {framework.recommended ? <Badge tone="amber">Recommended</Badge> : null}
              </div>
              <ol className="space-y-1.5">
                {framework.levels.map((level) => (
                  <li key={level.level} className="text-[13px]">
                    <span className="tabular font-semibold">L{level.level}</span>{' '}
                    <span className="font-medium">{level.name}</span>
                    <span className="text-[var(--color-slate)]"> — {level.definition}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
