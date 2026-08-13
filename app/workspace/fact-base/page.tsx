import {
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
import { formatDate, requireWorkspace, titleCase } from '@/lib/page';
import type { Severity } from '@/lib/types';

const SEVERITY_TONE: Record<Severity, 'critical' | 'amber' | 'lower'> = {
  high: 'critical',
  medium: 'amber',
  low: 'lower',
};

export const metadata = { title: 'Fact Base — Conductor' };

export default async function FactBasePage() {
  const { view } = await requireWorkspace();
  const evidenceById = new Map(view.evidence.map((e) => [e.id, e]));
  const capById = new Map(view.capabilityAreas.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Phase 2 · Fact base"
        title="Fact Base"
        description="Findings and the evidence behind them. Every finding names its sources and how many independent sources corroborate it, so a claim in the board pack can always be traced back to where it came from."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Evidence records" value={view.evidence.length} />
        <StatCard label="Findings" value={view.findings.length} />
        <StatCard
          label="High severity"
          value={view.findings.filter((f) => f.severity === 'high').length}
          tone="critical"
        />
      </div>

      <Card flush>
        <CardHeader title="Findings" hint="Grouped by capability area, with corroboration count." />
        <Table>
          <THead>
            <TR>
              <TH>Finding</TH>
              <TH>Capability area</TH>
              <TH>Type</TH>
              <TH>Severity</TH>
              <TH align="right">Corroboration</TH>
              <TH>Evidence</TH>
            </TR>
          </THead>
          <TBody>
            {view.findings.map((finding) => (
              <TR key={finding.id}>
                <TD>
                  <p className="font-medium">{finding.title}</p>
                  <p className="text-[13px] text-[var(--color-slate)] mt-0.5 max-w-[70ch]">
                    {finding.detail}
                  </p>
                </TD>
                <TD className="text-[var(--color-slate)]">
                  {capById.get(finding.capabilityAreaId)?.name ?? '—'}
                </TD>
                <TD>
                  <Badge tone={finding.findingType === 'strength' ? 'positive' : 'neutral'}>
                    {titleCase(finding.findingType)}
                  </Badge>
                </TD>
                <TD>
                  <Badge tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>
                </TD>
                <TD align="right" className="tabular">
                  {finding.corroboration}
                </TD>
                <TD className="text-[12.5px] text-[var(--color-slate)]">
                  {finding.evidenceIds
                    .map((id) => evidenceById.get(id)?.sourceLabel ?? id)
                    .join('; ')}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <CardHeader
          title="Evidence"
          hint="Interviews, documents, surveys, benchmarks and workshop output, each with a locator so it can be found again."
        />
        <Table>
          <THead>
            <TR>
              <TH width="90px">Ref</TH>
              <TH>Source</TH>
              <TH>Type</TH>
              <TH>Locator</TH>
              <TH>Extract</TH>
              <TH>Captured</TH>
            </TR>
          </THead>
          <TBody>
            {view.evidence.map((record) => (
              <TR key={record.id}>
                <TD className="tabular text-[var(--color-slate)]">{record.id}</TD>
                <TD className="font-medium">{record.sourceLabel}</TD>
                <TD>
                  <Badge tone="slate">{titleCase(record.sourceType)}</Badge>
                </TD>
                <TD className="text-[12.5px] text-[var(--color-slate)]">{record.locator}</TD>
                <TD className="max-w-[52ch] text-[13px] italic text-[var(--color-ink-soft)]">
                  &ldquo;{record.quote}&rdquo;
                </TD>
                <TD className="whitespace-nowrap text-[12.5px] text-[var(--color-slate)]">
                  {formatDate(record.capturedAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
