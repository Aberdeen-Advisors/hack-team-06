import { aberdeenOnly, bad, handle, oneOf, readJson, str } from '@/lib/api';
import { deriveOpportunity } from '@/lib/calc';
import { mutate } from '@/lib/store';
import type { MutationContext } from '@/lib/store';
import type {
  AISuggestion,
  Database,
  DependencyProposalPayload,
  HeadlineProposalPayload,
  MaturityProposalPayload,
  MergeProposalPayload,
  ScoreProposalPayload,
  SuggestionStatus,
} from '@/lib/types';

type Params = { params: Promise<{ id: string; suggestionId: string }> };

/**
 * Applying a suggestion to the canonical model. Accepting (or accepting an edited version)
 * genuinely mutates the working data; rejecting changes nothing but the suggestion's own status.
 */
function applyPayload(
  suggestion: AISuggestion,
  payload: unknown,
  db: Database,
  ctx: MutationContext,
  actor: { id: string; name: string },
): string {
  const engagementId = suggestion.engagementId;
  const audit = (action: string, targetType: string, targetId: string, detail: string) =>
    ctx.audit({
      engagementId,
      actorId: actor.id,
      actorName: actor.name,
      action,
      targetType,
      targetId,
      detail,
    });

  switch (suggestion.capability) {
    case 'maturity_level_proposal': {
      const p = (payload ?? {}) as MaturityProposalPayload;
      const focusArea = db.maturityFocusAreas.find(
        (f) => f.id === suggestion.targetId && f.engagementId === engagementId,
      );
      if (!focusArea) bad(`Suggestion targets a missing focus area ${suggestion.targetId}`);
      const before = `${focusArea.currentLevel ?? 'unassessed'}/${focusArea.targetLevel ?? 'unassessed'}`;
      if (p.currentLevel !== undefined) focusArea.currentLevel = p.currentLevel;
      if (p.targetLevel !== undefined) focusArea.targetLevel = p.targetLevel;
      if (p.rationale !== undefined) focusArea.rationale = p.rationale;
      // An accepted rating is a rating: the area is no longer unrated.
      if (focusArea.currentLevel !== null) focusArea.insufficientEvidence = false;
      const change = `Set "${focusArea.name}" maturity from ${before} to ${focusArea.currentLevel ?? 'unassessed'}/${focusArea.targetLevel ?? 'unassessed'}.`;
      audit('maturity.updated', 'maturity_focus_area', focusArea.id, `${change} Applied from AI suggestion ${suggestion.id}.`);
      return change;
    }
    case 'opportunity_score_proposal': {
      const p = (payload ?? {}) as ScoreProposalPayload;
      const opp = db.opportunities.find(
        (o) => o.id === suggestion.targetId && o.engagementId === engagementId,
      );
      if (!opp) bad(`Suggestion targets a missing opportunity ${suggestion.targetId}`);
      const engagement = db.engagements.find((e) => e.id === engagementId);
      const model = db.scoringModels.find((m) => m.id === engagement?.scoringModelId);
      if (!model) bad('Engagement has no scoring model');
      let score = db.opportunityScores.find((s) => s.opportunityId === opp.id);
      const before = score
        ? `${score.financialImpact}/${score.riskIfDeferred}/${score.strategicAlignment}`
        : 'unscored';
      if (!score) {
        score = {
          id: ctx.id('oscore'),
          opportunityId: opp.id,
          scoringModelId: model.id,
          financialImpact: p.financialImpact,
          riskIfDeferred: p.riskIfDeferred,
          strategicAlignment: p.strategicAlignment,
          rationale: p.rationale,
          evidenceIds: {
            financial_impact: suggestion.evidenceIds,
            risk_if_deferred: suggestion.evidenceIds,
            strategic_alignment: suggestion.evidenceIds,
          },
          scoredBy: actor.name,
          scoredAt: new Date().toISOString(),
        };
        db.opportunityScores.push(score);
      } else {
        score.financialImpact = p.financialImpact;
        score.riskIfDeferred = p.riskIfDeferred;
        score.strategicAlignment = p.strategicAlignment;
        if (p.rationale) score.rationale = p.rationale;
        score.scoredBy = actor.name;
        score.scoredAt = new Date().toISOString();
      }
      const derived = deriveOpportunity(score, model);
      const change = `Rescored ${opp.displayCode} from ${before} to ${score.financialImpact}/${score.riskIfDeferred}/${score.strategicAlignment} (weighted ${derived.weighted}, ${derived.band}).`;
      audit('opportunity.scored', 'opportunity', opp.id, `${change} Applied from AI suggestion ${suggestion.id}.`);
      return change;
    }
    case 'dependency_inference': {
      const p = (payload ?? {}) as DependencyProposalPayload;
      const from = db.initiatives.find((i) => i.id === p.fromInitiativeId && i.engagementId === engagementId);
      const to = db.initiatives.find((i) => i.id === p.toInitiativeId && i.engagementId === engagementId);
      if (!from || !to) bad('Suggested dependency references a missing initiative');
      const exists = db.dependencies.find(
        (d) =>
          d.engagementId === engagementId &&
          d.fromInitiativeId === p.fromInitiativeId &&
          d.toInitiativeId === p.toInitiativeId &&
          d.type === p.type,
      );
      if (exists) return `Dependency "${from.name}" -> "${to.name}" already existed; no change made.`;
      const dependency = {
        id: ctx.id('dep'),
        engagementId,
        fromInitiativeId: p.fromInitiativeId,
        toInitiativeId: p.toInitiativeId,
        type: p.type,
        rationale: p.rationale,
        source: 'ai_inferred' as const,
        strength: p.strength,
      };
      db.dependencies.push(dependency);
      const change = `Created ${p.strength} ${p.type.replace(/_/g, ' ')} dependency "${from.name}" -> "${to.name}".`;
      audit('dependency.created', 'dependency', dependency.id, `${change} Applied from AI suggestion ${suggestion.id}.`);
      return change;
    }
    case 'duplicate_merge_proposal': {
      const p = (payload ?? {}) as MergeProposalPayload;
      const keep = db.opportunities.find((o) => o.id === p.keepOpportunityId && o.engagementId === engagementId);
      const merge = db.opportunities.find((o) => o.id === p.mergeOpportunityId && o.engagementId === engagementId);
      if (!keep) bad(`Merge target ${p.keepOpportunityId} not found`);
      if (!merge) return `Opportunity ${p.mergeOpportunityId} was already merged or removed; no change made.`;
      keep.title = p.mergedTitle;
      keep.description = p.mergedDescription;
      keep.linkedFindingIds = Array.from(new Set([...keep.linkedFindingIds, ...merge.linkedFindingIds]));
      keep.status = 'Updated';
      db.opportunities = db.opportunities.filter((o) => o.id !== merge.id);
      db.opportunityScores = db.opportunityScores.filter((s) => s.opportunityId !== merge.id);
      const change = `Merged ${merge.displayCode} into ${keep.displayCode} and retitled it "${p.mergedTitle}".`;
      audit('opportunity.merged', 'opportunity', keep.id, `${change} Applied from AI suggestion ${suggestion.id}.`);
      return change;
    }
    case 'board_headline_draft': {
      const p = (payload ?? {}) as HeadlineProposalPayload;
      // The canonical home for an accepted narrative line is the decision log.
      const decision = {
        id: ctx.id('dec'),
        engagementId,
        title: 'Board narrative headline agreed',
        question: 'What is the single headline the board pack leads with?',
        optionsConsidered: [p.headline],
        decision: p.headline,
        rationale: p.supportingLine,
        decidedBy: actor.name,
        decidedAt: new Date().toISOString(),
        affectedIds: [engagementId],
      };
      db.decisions.push(decision);
      const change = `Recorded the board headline in the decision log: "${p.headline}"`;
      audit('decision.created', 'decision', decision.id, `${change} Applied from AI suggestion ${suggestion.id}.`);
      return change;
    }
    default:
      bad(`Cannot apply capability ${suggestion.capability}`);
  }
}

const STATUSES: SuggestionStatus[] = ['accepted', 'edited', 'rejected'];

/**
 * Aberdeen only: accept, accept-with-edits, or reject a suggestion.
 * `accepted` / `edited` apply the payload to the canonical model and write an audit event.
 * `rejected` records the decision and changes nothing else.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id, suggestionId } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);
    const status = oneOf<SuggestionStatus>(body, 'status', STATUSES) as SuggestionStatus;
    const note = str(body, 'note', false);

    return mutate((ctx) => {
      const { db, audit } = ctx;
      const suggestion = db.aiSuggestions.find(
        (s) => s.id === suggestionId && s.engagementId === id,
      );
      if (!suggestion) bad(`Unknown suggestion ${suggestionId}`);
      if (suggestion.status !== 'proposed') {
        bad(`Suggestion ${suggestionId} was already ${suggestion.status}`);
      }

      let appliedChange: string | null = null;
      if (status === 'accepted' || status === 'edited') {
        const payload = status === 'edited' && body.payload !== undefined ? body.payload : suggestion.payload;
        if (status === 'edited') suggestion.payload = payload;
        appliedChange = applyPayload(suggestion, payload, db, ctx, user);
      } else {
        audit({
          engagementId: id,
          actorId: user.id,
          actorName: user.name,
          action: 'ai_suggestion.rejected',
          targetType: 'ai_suggestion',
          targetId: suggestion.id,
          detail: `Rejected ${suggestion.capabilityLabel} for ${suggestion.targetId}${note ? `: ${note}` : '.'}`,
        });
      }

      suggestion.status = status;
      suggestion.reviewedBy = user.name;
      suggestion.reviewedAt = new Date().toISOString();

      audit({
        engagementId: id,
        actorId: user.id,
        actorName: user.name,
        action: `ai_suggestion.${status}`,
        targetType: 'ai_suggestion',
        targetId: suggestion.id,
        detail: `${suggestion.capabilityLabel} ${status} (${suggestion.modelVersion}, confidence ${suggestion.confidence}).${appliedChange ? ` ${appliedChange}` : ''}`,
      });

      return { suggestion, appliedChange };
    });
  });
}
