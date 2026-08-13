import { aberdeenOnly, bad, handle, oneOf, readJson, str } from '@/lib/api';
import { detectCycles } from '@/lib/calc';
import { mutate } from '@/lib/store';
import type { MutationContext } from '@/lib/store';
import type {
  ClientSubmission,
  Database,
  DependencySuggestionPayload,
  RankingSubmissionPayload,
  TimingFeedbackPayload,
} from '@/lib/types';

type Params = { params: Promise<{ id: string; subId: string }> };

/**
 * Closing the loop. Accepting client feedback genuinely mutates the working model:
 *  - ranking            -> writes the client rank onto the opportunity
 *  - dependency_suggestion -> creates the dependency
 *  - timing_feedback    -> moves the initiative to the requested wave
 *  - comment / edit     -> records acknowledgement only
 * Every acceptance sets `appliedChange` describing exactly what changed, plus an audit event.
 */
function applySubmission(
  submission: ClientSubmission,
  db: Database,
  ctx: MutationContext,
  actor: { id: string; name: string },
): string {
  const engagementId = submission.engagementId;
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

  switch (submission.kind) {
    case 'ranking': {
      const p = (submission.payload ?? {}) as RankingSubmissionPayload;
      const opp = db.opportunities.find(
        (o) => o.id === submission.targetId && o.engagementId === engagementId,
      );
      if (!opp) bad(`Submission targets a missing opportunity ${submission.targetId}`);
      if (typeof p.clientRank !== 'number') bad('Submission payload has no clientRank');
      const before = opp.clientRank;
      opp.clientRank = p.clientRank;
      const change = `Set client rank ${p.clientRank} on ${opp.displayCode} (was ${before ?? 'unranked'}).`;
      audit('opportunity.updated', 'opportunity', opp.id, `${change} Applied from client submission ${submission.id}.`);
      return change;
    }
    case 'dependency_suggestion': {
      const p = (submission.payload ?? {}) as DependencySuggestionPayload;
      const from = db.initiatives.find((i) => i.id === p.fromInitiativeId && i.engagementId === engagementId);
      const to = db.initiatives.find((i) => i.id === p.toInitiativeId && i.engagementId === engagementId);
      if (!from || !to) bad('Suggested dependency references a missing initiative');
      const existing = db.dependencies.filter((d) => d.engagementId === engagementId);
      if (
        existing.some(
          (d) =>
            d.fromInitiativeId === p.fromInitiativeId &&
            d.toInitiativeId === p.toInitiativeId &&
            d.type === (p.type ?? 'finish_to_start'),
        )
      ) {
        return `Dependency "${from.name}" -> "${to.name}" already existed; recorded the client's agreement with it.`;
      }
      const dependency = {
        id: ctx.id('dep'),
        engagementId,
        fromInitiativeId: p.fromInitiativeId,
        toInitiativeId: p.toInitiativeId,
        type: p.type ?? 'finish_to_start',
        rationale: p.rationale ?? submission.body,
        source: 'client_suggested' as const,
        strength: p.strength ?? 'soft',
      };
      if (detectCycles([...existing, dependency]).length > detectCycles(existing).length) {
        bad('Accepting that dependency would create a circular chain; reject it or amend the plan first');
      }
      db.dependencies.push(dependency);
      const change = `Created ${dependency.strength} ${dependency.type.replace(/_/g, ' ')} dependency "${from.name}" -> "${to.name}" from client suggestion.`;
      audit('dependency.created', 'dependency', dependency.id, `${change} Applied from client submission ${submission.id}.`);
      return change;
    }
    case 'timing_feedback': {
      const p = (submission.payload ?? {}) as TimingFeedbackPayload;
      const init = db.initiatives.find(
        (i) => i.id === submission.targetId && i.engagementId === engagementId,
      );
      if (!init) bad(`Submission targets a missing initiative ${submission.targetId}`);
      const wave = db.waves.find((w) => w.id === p.waveId && w.engagementId === engagementId);
      if (!wave) bad(`Submission requests a missing wave ${String(p.waveId)}`);
      const before = init.waveId ? db.waves.find((w) => w.id === init.waveId)?.label ?? init.waveId : 'unassigned';
      init.waveId = wave.id;
      const change = `Moved "${init.name}" from ${before} to ${wave.label}.`;
      audit('initiative.updated', 'initiative', init.id, `${change} Applied from client submission ${submission.id}.`);
      return change;
    }
    case 'comment':
    case 'edit': {
      const change = `Acknowledged ${submission.kind === 'edit' ? 'suggested edit' : 'comment'} from ${submission.submittedByName}; no model change was required.`;
      audit(
        'submission.acknowledged',
        submission.targetType,
        submission.targetId ?? engagementId,
        `${change} Submission ${submission.id}.`,
      );
      return change;
    }
    default:
      bad(`Cannot apply submission kind ${submission.kind}`);
  }
}

/** Aberdeen only: accept or reject client feedback. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, subId } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);
    const status = oneOf<'accepted' | 'rejected'>(body, 'status', ['accepted', 'rejected']) as
      | 'accepted'
      | 'rejected';
    const reviewNote = str(body, 'reviewNote', false) ?? '';

    return mutate((ctx) => {
      const { db, audit } = ctx;
      const submission = db.clientSubmissions.find((s) => s.id === subId && s.engagementId === id);
      if (!submission) bad(`Unknown submission ${subId}`);
      if (submission.status !== 'pending') {
        bad(`Submission ${subId} was already ${submission.status}`);
      }

      let appliedChange: string | null = null;
      if (status === 'accepted') {
        appliedChange = applySubmission(submission, db, ctx, user);
      }

      submission.status = status;
      submission.reviewNote = reviewNote || null;
      submission.reviewedBy = user.name;
      submission.reviewedAt = new Date().toISOString();
      submission.appliedChange = appliedChange;

      audit({
        engagementId: id,
        actorId: user.id,
        actorName: user.name,
        action: `submission.${status}`,
        targetType: 'client_submission',
        targetId: submission.id,
        detail: `${status === 'accepted' ? 'Accepted' : 'Rejected'} ${submission.kind.replace(/_/g, ' ')} feedback from ${submission.submittedByName}.${appliedChange ? ` ${appliedChange}` : ''}${reviewNote ? ` Note: ${reviewNote}` : ''}`,
      });

      return { submission, appliedChange };
    });
  });
}
