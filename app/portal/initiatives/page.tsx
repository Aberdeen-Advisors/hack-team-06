import {
  Badge,
  BandBadge,
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
import { requirePortal } from '@/lib/page';

export default async function PortalInitiativesPage() {
  const { snapshot } = await requirePortal();

  if (!snapshot || !snapshot.selection.includeInitiatives || snapshot.payload.initiatives.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow={snapshot ? `Published version ${snapshot.version}` : 'Not published'}
          title="Initiatives"
        />
        <EmptyState
          title="Initiatives are not part of this published version"
          description={
            snapshot
              ? `Version ${snapshot.version} publishes the opportunity register but not yet the initiatives that group it into fundable pieces of work. They will appear here in the next version.`
              : 'Nothing has been published yet.'
          }
        />
      </div>
    );
  }

  const payload = snapshot.payload;
  const derivedByInit = new Map(payload.derived.initiatives.map((d) => [d.initiativeId, d]));
  const waveById = new Map(payload.waves.map((w) => [w.id, w]));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={`Published version ${snapshot.version}`}
        title="Initiatives"
        description="Each initiative groups a set of opportunities into one ownable piece of work, with the outcome it is meant to deliver."
      />

      {payload.themes.map((theme) => {
        const initiatives = payload.initiatives.filter((i) => i.themeId === theme.id);
        if (initiatives.length === 0) return null;
        return (
          <Card key={theme.id} flush>
            <CardHeader title={theme.name} hint={theme.description} />
            <Table>
              <THead>
                <TR>
                  <TH>Initiative</TH>
                  <TH>Outcome</TH>
                  <TH>Owner</TH>
                  <TH>Wave</TH>
                  <TH align="center">Size</TH>
                  <TH align="right">Opportunities</TH>
                  {snapshot.selection.includeScores ? <TH>Priority</TH> : null}
                </TR>
              </THead>
              <TBody>
                {initiatives.map((initiative) => {
                  const derived = derivedByInit.get(initiative.id);
                  return (
                    <TR key={initiative.id}>
                      <TD>
                        <p className="font-medium">{initiative.name}</p>
                        <p className="text-[12.5px] text-[var(--color-slate)] mt-0.5 max-w-[54ch]">
                          {initiative.description}
                        </p>
                      </TD>
                      <TD className="text-[13px] text-[var(--color-slate)] max-w-[44ch]">
                        {initiative.targetOutcome}
                      </TD>
                      <TD className="text-[13px]">{initiative.owner || 'To confirm'}</TD>
                      <TD className="text-[13px]">
                        {initiative.waveId
                          ? (waveById.get(initiative.waveId)?.label ?? '—')
                          : 'Not yet sequenced'}
                      </TD>
                      <TD align="center">
                        <Badge tone="neutral">{initiative.tShirtSize}</Badge>
                      </TD>
                      <TD align="right" className="tabular">
                        {derived?.opportunityCount ?? 0}
                      </TD>
                      {snapshot.selection.includeScores ? (
                        <TD>
                          <BandBadge band={derived?.band ?? null} />
                        </TD>
                      ) : null}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>
        );
      })}
    </div>
  );
}
