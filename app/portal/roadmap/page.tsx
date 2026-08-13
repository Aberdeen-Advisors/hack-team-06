import { FilterBar } from '@/components/FilterBar';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  SectionHeader,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ui';
import { formatDate, requirePortal, titleCase } from '@/lib/page';

/** `?theme=` lets the client read the sequence one theme at a time. */
export default async function PortalRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { snapshot } = await requirePortal();
  const query = await searchParams;
  const themeFilter = typeof query.theme === 'string' ? query.theme : '';

  if (!snapshot || !snapshot.selection.includeRoadmap || snapshot.payload.waves.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow={snapshot ? `Published version ${snapshot.version}` : 'Not published'}
          title="Roadmap"
        />
        <EmptyState
          title="The roadmap is not part of this published version"
          description={
            snapshot
              ? `Version ${snapshot.version} covers the current state, the maturity assessment and the opportunity register. Sequencing is still being worked through and will appear here when your advisory team publishes the next version.`
              : 'Nothing has been published yet.'
          }
        />
      </div>
    );
  }

  const payload = snapshot.payload;
  const nameOf = (id: string) => payload.initiatives.find((i) => i.id === id)?.name ?? id;
  const themeOf = (id: string) => payload.initiatives.find((i) => i.id === id)?.themeId ?? null;
  const inFilter = (initiativeId: string) =>
    themeFilter === '' || themeOf(initiativeId) === themeFilter;
  const themeName = payload.themes.find((t) => t.id === themeFilter)?.name ?? null;
  const dependencies = payload.dependencies.filter(
    (d) => inFilter(d.fromInitiativeId) || inFilter(d.toInitiativeId),
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={`Published version ${snapshot.version}`}
        title="Roadmap"
        description={
          themeName
            ? `The sequence as published, showing only the ${themeName} theme and the dependencies that touch it.`
            : 'The sequence as published, with the dependencies that drive it.'
        }
      />

      <FilterBar
        filters={[
          {
            param: 'theme',
            label: 'Theme',
            anyLabel: 'All themes',
            options: payload.themes
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((theme) => ({ value: theme.id, label: theme.name })),
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-4 sm:grid-cols-2">
        {payload.waves
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map((wave) => {
            const initiatives = payload.initiatives.filter(
              (i) => i.waveId === wave.id && inFilter(i.id),
            );
            return (
              <Card key={wave.id} flush className="flex flex-col" testId={`wave-card-${wave.id}`}>
                <div className="px-4 pt-4 pb-3 border-b border-[var(--color-line)]">
                  <p className="label">{`${formatDate(wave.startsOn)} – ${formatDate(wave.endsOn)}`}</p>
                  <h3 className="text-[16px] mt-1">{wave.label}</h3>
                  <p className="text-[12.5px] text-[var(--color-slate)] mt-1">
                    {wave.targetOutcome}
                  </p>
                </div>
                <ul className="divide-y divide-[var(--color-line)] grow">
                  {initiatives.map((initiative) => (
                    <li key={initiative.id} className="px-4 py-3">
                      <p className="text-[13.5px] font-medium">{initiative.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge tone="neutral">{initiative.tShirtSize}</Badge>
                        <span className="text-[12px] text-[var(--color-slate)]">
                          {initiative.owner || 'Owner to confirm'}
                        </span>
                      </div>
                    </li>
                  ))}
                  {initiatives.length === 0 ? (
                    <li className="px-4 py-6 text-[13px] text-[var(--color-slate-light)] text-center">
                      {themeName ? `No ${themeName} work in this wave` : 'Nothing sequenced in this wave'}
                    </li>
                  ) : null}
                </ul>
              </Card>
            );
          })}
      </div>

      {dependencies.length > 0 ? (
        <Card flush>
          <CardHeader
            title="Why the order is what it is"
            hint="Hard dependencies constrain the sequence; soft dependencies are preferences."
          />
          <Table>
            <THead>
              <TR>
                <TH>This must happen first</TH>
                <TH>Before this</TH>
                <TH>Strength</TH>
                <TH>Reason</TH>
              </TR>
            </THead>
            <TBody>
              {dependencies.map((dependency) => (
                <TR key={dependency.id}>
                  <TD className="font-medium">{nameOf(dependency.fromInitiativeId)}</TD>
                  <TD className="font-medium">{nameOf(dependency.toInitiativeId)}</TD>
                  <TD>
                    <Badge tone={dependency.strength === 'hard' ? 'ink' : 'neutral'}>
                      {dependency.strength} · {titleCase(dependency.type)}
                    </Badge>
                  </TD>
                  <TD className="text-[13px] text-[var(--color-slate)] max-w-[60ch]">
                    {dependency.rationale}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
