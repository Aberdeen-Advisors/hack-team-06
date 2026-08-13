import { Card, EmptyState, SectionHeader } from '@/components/ui';
import { formatDate, requirePortal } from '@/lib/page';

export default async function PortalDecisionsPage() {
  const { snapshot } = await requirePortal();

  if (!snapshot || !snapshot.selection.includeDecisions || snapshot.payload.decisions.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow={snapshot ? `Published version ${snapshot.version}` : 'Not published'}
          title="Decisions"
        />
        <EmptyState
          title="No decisions in this published version"
          description="The decision log will appear here once your advisory team includes it in a published version."
        />
      </div>
    );
  }

  const decisions = [...snapshot.payload.decisions].sort(
    (a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime(),
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={`Published version ${snapshot.version}`}
        title="Decisions"
        description="Every decision that shaped the roadmap, the options that were considered, and the reasoning that settled it."
      />

      <div className="space-y-5">
        {decisions.map((decision) => (
          <Card key={decision.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
              <h3 className="text-[18px]">{decision.title}</h3>
              <p className="text-[12.5px] text-[var(--color-slate)]">
                {decision.decidedBy} · {formatDate(decision.decidedAt)}
              </p>
            </div>
            <p className="label mb-1">The question</p>
            <p className="text-[14px] text-[var(--color-ink-soft)] mb-4">{decision.question}</p>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div>
                <p className="label mb-1.5">Options considered</p>
                <ul className="space-y-1">
                  {decision.optionsConsidered.map((option) => (
                    <li
                      key={option}
                      className={`text-[13.5px] ${
                        option === decision.decision
                          ? 'font-medium'
                          : 'text-[var(--color-slate)] line-through decoration-[var(--color-line-strong)]'
                      }`}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="label mb-1.5">Decision and reasoning</p>
                <p className="text-[14px] font-medium">{decision.decision}</p>
                <p className="text-[13.5px] text-[var(--color-slate)] mt-1.5">
                  {decision.rationale}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
