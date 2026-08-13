import {
  Badge,
  Card,
  CardHeader,
  ConfidenceBadge,
  EmptyState,
  SectionHeader,
  StatCard,
} from '@/components/ui';
import { formatDateTime, requireWorkspace } from '@/lib/page';

import { SuggestionActions } from './SuggestionActions';

export const metadata = { title: 'AI Review — Conductor' };

/**
 * Renders a suggestion payload as readable lines rather than raw JSON. Any key that holds an
 * entity id is resolved to that entity's name — a reviewer should never have to decode
 * `init_master_data` to decide whether to accept a proposal.
 */
function PayloadLines({
  payload,
  resolve,
}: {
  payload: unknown;
  resolve: (key: string, value: string) => string;
}) {
  if (payload === null || typeof payload !== 'object') return null;
  const entries = Object.entries(payload as Record<string, unknown>);
  const label = (key: string) =>
    key
      .replace(/Id$/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  return (
    <dl className="mt-3 space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-[13px]">
          <dt className="label shrink-0 w-[168px] pt-0.5">{label(key)}</dt>
          <dd className="text-[var(--color-ink-soft)]">
            {typeof value === 'object' && value !== null
              ? Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <span key={k} className="block">
                    <span className="text-[var(--color-slate)]">{k.replace(/_/g, ' ')}: </span>
                    {String(v)}
                  </span>
                ))
              : resolve(key, String(value))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AiReviewPage() {
  const { view } = await requireWorkspace();
  const proposed = view.aiSuggestions.filter((s) => s.status === 'proposed');
  const reviewed = view.aiSuggestions.filter((s) => s.status !== 'proposed');
  const evidenceById = new Map(view.evidence.map((e) => [e.id, e]));

  const targetLabel = (targetType: string, targetId: string): string => {
    if (targetType === 'opportunity') {
      const opp = view.opportunities.find((o) => o.id === targetId);
      return opp ? `${opp.displayCode} ${opp.title}` : targetId;
    }
    if (targetType === 'initiative') {
      return view.initiatives.find((i) => i.id === targetId)?.name ?? targetId;
    }
    if (targetType === 'maturity_focus_area') {
      return view.maturityRows.find((r) => r.focusArea.id === targetId)?.focusArea.name ?? targetId;
    }
    return view.engagement.clientName;
  };

  /** Turns an id-bearing payload value into the name of the thing it points at. */
  const resolvePayloadValue = (key: string, value: string): string => {
    if (key.endsWith('InitiativeId')) {
      return view.initiatives.find((i) => i.id === value)?.name ?? value;
    }
    if (key.endsWith('OpportunityId') || key === 'opportunityId') {
      const opp = view.opportunities.find((o) => o.id === value);
      return opp ? `${opp.displayCode} ${opp.title}` : value;
    }
    if (key === 'waveId') {
      return view.waves.find((w) => w.id === value)?.label ?? value;
    }
    if (key === 'themeId') {
      return view.themes.find((t) => t.id === value)?.name ?? value;
    }
    if (key === 'focusAreaId') {
      return view.maturityRows.find((r) => r.focusArea.id === value)?.focusArea.name ?? value;
    }
    return value;
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Human in the loop"
        title="AI Review"
        description="Mocked model outputs, clearly labelled with their model version. Accepting a suggestion applies it to the working model and writes an audit event; rejecting records the decision and changes nothing. Nothing here reaches the client until it is published."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting review" value={proposed.length} tone="amber" />
        <StatCard
          label="Accepted"
          value={view.aiSuggestions.filter((s) => s.status === 'accepted' || s.status === 'edited').length}
        />
        <StatCard
          label="Rejected"
          value={view.aiSuggestions.filter((s) => s.status === 'rejected').length}
        />
      </div>

      {proposed.length === 0 ? (
        <EmptyState
          title="Nothing awaiting review"
          description="Every suggestion has been accepted or rejected. Reset the demo data to bring the queue back."
        />
      ) : (
        <div className="space-y-5">
          {proposed.map((suggestion) => (
            <Card key={suggestion.id} flush>
              <CardHeader
                title={suggestion.capabilityLabel}
                hint={`Target: ${targetLabel(suggestion.targetType, suggestion.targetId)}`}
                action={
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge
                      confidence={suggestion.confidence}
                      band={suggestion.confidenceBand}
                    />
                    <Badge tone="slate">{suggestion.modelVersion}</Badge>
                  </div>
                }
              />
              <div className="px-5 py-4">
                <p className="text-[13.5px] text-[var(--color-ink-soft)] max-w-[86ch]">
                  {suggestion.rationale}
                </p>
                <PayloadLines payload={suggestion.payload} resolve={resolvePayloadValue} />
                {suggestion.evidenceIds.length > 0 ? (
                  <div className="mt-4 border-t border-[var(--color-line)] pt-3">
                    <p className="label mb-1.5">Evidence cited</p>
                    <ul className="space-y-1">
                      {suggestion.evidenceIds.map((id) => {
                        const record = evidenceById.get(id);
                        return (
                          <li key={id} className="text-[12.5px] text-[var(--color-slate)]">
                            {record
                              ? `${record.sourceLabel} (${record.locator}) — “${record.quote}”`
                              : id}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-[var(--color-line)] bg-[var(--color-canvas)] no-print">
                <p className="text-[12.5px] text-[var(--color-slate)]">
                  Proposed {formatDateTime(suggestion.createdAt)}
                </p>
                <SuggestionActions
                  engagementId={view.engagement.id}
                  suggestionId={suggestion.id}
                  label={suggestion.capabilityLabel}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {reviewed.length > 0 ? (
        <Card flush>
          <CardHeader title="Already reviewed" hint="Decisions taken on earlier suggestions." />
          <ul className="divide-y divide-[var(--color-line)]">
            {reviewed.map((suggestion) => (
              <li key={suggestion.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13.5px] font-medium">{suggestion.capabilityLabel}</p>
                  <p className="text-[12.5px] text-[var(--color-slate)]">
                    {targetLabel(suggestion.targetType, suggestion.targetId)}
                    {suggestion.reviewedBy ? ` · reviewed by ${suggestion.reviewedBy}` : ''}
                  </p>
                </div>
                <Badge tone={suggestion.status === 'rejected' ? 'critical' : 'positive'}>
                  {suggestion.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
