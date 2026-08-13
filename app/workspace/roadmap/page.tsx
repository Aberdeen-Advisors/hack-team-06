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
import { formatDate, requireWorkspace, titleCase } from '@/lib/page';

import { DeleteDependencyButton, DependencyForm, WaveSelect } from './RoadmapEditors';

export const metadata = { title: 'Roadmap — Conductor' };

export default async function RoadmapPage() {
  const { view } = await requireWorkspace();
  const unassigned = view.initiativeRows.filter((r) => r.wave === null);
  const nameOf = (id: string) => view.initiatives.find((i) => i.id === id)?.name ?? id;
  const waveOptions = view.waves.map((w) => ({ id: w.id, label: w.label }));
  const initiativeOptions = [...view.initiatives]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => ({ id: i.id, label: i.name }));
  const sequencing = [...view.initiativeRows].sort(
    (a, b) =>
      (a.wave?.sequence ?? 99) - (b.wave?.sequence ?? 99) ||
      a.initiative.name.localeCompare(b.initiative.name),
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Phase 4 · Sequencing"
        title="Roadmap"
        description="Four waves across 2027 and 2028. The earliest column is computed from hard finish-to-start and enables dependencies: it is the first wave an initiative could legally occupy, whatever the plan currently says."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Waves" value={view.waves.length} />
        <StatCard label="Dependencies" value={view.dependencies.length} />
        <StatCard
          label="Feasibility issues"
          value={view.feasibility.length}
          tone={view.feasibility.length > 0 ? 'critical' : 'default'}
        />
        <StatCard
          label="Cycles"
          value={view.cycles.length}
          tone={view.cycles.length > 0 ? 'critical' : 'default'}
          hint={view.cycles.length === 0 ? 'The dependency graph is acyclic' : undefined}
        />
      </div>

      <Card flush>
        <CardHeader
          title="Feasibility"
          hint="Each issue names the initiative, the dependency where relevant, and the minimum change that resolves it."
        />
        {view.feasibility.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No feasibility issues"
              description="Every initiative sits in a wave that satisfies its hard dependencies, has an owner where it blocks other work, and no wave carries more than three large initiatives."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Issue</TH>
                <TH>What is wrong</TH>
                <TH>Minimum fix</TH>
              </TR>
            </THead>
            <TBody>
              {view.feasibility.map((issue, index) => (
                <TR key={`${issue.type}-${index}`}>
                  <TD className="whitespace-nowrap">
                    <Badge tone={issue.severity === 'high' ? 'critical' : 'amber'}>
                      {issue.type.replace(/_/g, ' ')}
                    </Badge>
                  </TD>
                  <TD className="text-[13.5px] max-w-[60ch]">{issue.message}</TD>
                  <TD className="text-[13.5px] text-[var(--color-slate)] max-w-[48ch]">
                    {issue.resolution}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-4 sm:grid-cols-2">
        {view.waves.map((wave) => {
          const rows = view.initiativeRows.filter((r) => r.wave?.id === wave.id);
          return (
            <Card key={wave.id} flush className="flex flex-col" testId={`wave-card-${wave.id}`}>
              <div className="px-4 pt-4 pb-3 border-b border-[var(--color-line)]">
                <p className="label">{`${formatDate(wave.startsOn)} – ${formatDate(wave.endsOn)}`}</p>
                <h3 className="text-[16px] mt-1">{wave.label}</h3>
                <p className="text-[12.5px] text-[var(--color-slate)] mt-1">{wave.targetOutcome}</p>
              </div>
              <ul className="divide-y divide-[var(--color-line)] grow">
                {rows.map((row) => (
                  <li key={row.initiative.id} className="px-4 py-3">
                    <p className="text-[13.5px] font-medium">{row.initiative.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge tone="neutral">{row.initiative.tShirtSize}</Badge>
                      {row.earliestWaveSequence > wave.sequence ? (
                        <Badge tone="critical">Too early</Badge>
                      ) : null}
                    </div>
                    <p className="text-[12px] text-[var(--color-slate)] mt-1">
                      {row.initiative.owner.trim() === '' ? 'No owner named' : row.initiative.owner}
                    </p>
                  </li>
                ))}
                {rows.length === 0 ? (
                  <li className="px-4 py-6 text-[13px] text-[var(--color-slate-light)] text-center">
                    Nothing sequenced here yet
                  </li>
                ) : null}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card flush>
        <CardHeader
          title="Sequencing"
          hint={`Move an initiative between waves here. The earliest column is the first wave its hard dependencies allow; ${unassigned.length} initiative(s) are not sequenced at all.`}
        />
        <Table>
          <THead>
            <TR>
              <TH>Initiative</TH>
              <TH>Theme</TH>
              <TH align="center">Size</TH>
              <TH align="right">Earliest possible</TH>
              <TH>Wave</TH>
            </TR>
          </THead>
          <TBody>
            {sequencing.map((row) => (
              <TR key={row.initiative.id}>
                <TD className="font-medium">{row.initiative.name}</TD>
                <TD className="text-[var(--color-slate)] text-[13px]">{row.theme?.name ?? '—'}</TD>
                <TD align="center">
                  <Badge tone="neutral">{row.initiative.tShirtSize}</Badge>
                </TD>
                <TD align="right" className="tabular text-[13px]">
                  {view.waves.find((w) => w.sequence === row.earliestWaveSequence)?.label ??
                    `Wave ${row.earliestWaveSequence}`}
                </TD>
                <TD className="no-print">
                  <WaveSelect
                    engagementId={view.engagement.id}
                    initiativeId={row.initiative.id}
                    initiativeName={row.initiative.name}
                    waves={waveOptions}
                    current={row.wave?.id ?? null}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <CardHeader
          title="Dependencies"
          hint="Hard finish-to-start and enables dependencies constrain sequencing; soft ones are advisory."
        />
        <div className="px-5 py-4 border-b border-[var(--color-line)] no-print">
          <h4 className="text-[15px] mb-3">Add a dependency</h4>
          <DependencyForm
            engagementId={view.engagement.id}
            initiatives={initiativeOptions}
          />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>From</TH>
              <TH>To</TH>
              <TH>Type</TH>
              <TH>Strength</TH>
              <TH>Source</TH>
              <TH>Rationale</TH>
              <TH align="right">&nbsp;</TH>
            </TR>
          </THead>
          <TBody>
            {view.dependencies.map((dependency) => (
              <TR key={dependency.id}>
                <TD className="font-medium">{nameOf(dependency.fromInitiativeId)}</TD>
                <TD className="font-medium">{nameOf(dependency.toInitiativeId)}</TD>
                <TD className="whitespace-nowrap text-[13px]">
                  {titleCase(dependency.type)}
                </TD>
                <TD>
                  <Badge tone={dependency.strength === 'hard' ? 'ink' : 'neutral'}>
                    {dependency.strength}
                  </Badge>
                </TD>
                <TD>
                  <Badge tone="slate">{titleCase(dependency.source)}</Badge>
                </TD>
                <TD className="text-[13px] text-[var(--color-slate)] max-w-[54ch]">
                  {dependency.rationale}
                </TD>
                <TD align="right" className="no-print">
                  <DeleteDependencyButton
                    engagementId={view.engagement.id}
                    dependencyId={dependency.id}
                    label={`"${nameOf(dependency.fromInitiativeId)}" to "${nameOf(dependency.toInitiativeId)}"`}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
