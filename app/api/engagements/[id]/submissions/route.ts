import { anyRole, bad, clientOnly, handle, oneOf, readJson, str } from '@/lib/api';
import { latestSnapshot } from '@/lib/publish';
import { getDb, mutate } from '@/lib/store';
import type { ClientSubmission, SubmissionKind, SubmissionTargetType } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

const KINDS: SubmissionKind[] = [
  'comment',
  'ranking',
  'edit',
  'dependency_suggestion',
  'timing_feedback',
];
const TARGET_TYPES: SubmissionTargetType[] = ['initiative', 'opportunity', 'roadmap', 'engagement'];

/** Aberdeen sees every submission; a client sees only their own. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    const { user, role } = await anyRole(id);
    const all = getDb().clientSubmissions.filter((s) => s.engagementId === id);
    const submissions = role === 'aberdeen' ? all : all.filter((s) => s.submittedBy === user.id);
    return {
      submissions,
      counts: {
        pending: submissions.filter((s) => s.status === 'pending').length,
        accepted: submissions.filter((s) => s.status === 'accepted').length,
        rejected: submissions.filter((s) => s.status === 'rejected').length,
      },
    };
  });
}

/** Client only: raise feedback against the published snapshot they are looking at. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    const user = await clientOnly(id);
    const body = await readJson(request);
    const kind = oneOf<SubmissionKind>(body, 'kind', KINDS) as SubmissionKind;
    const targetType = oneOf<SubmissionTargetType>(body, 'targetType', TARGET_TYPES) as SubmissionTargetType;
    const bodyText = str(body, 'body', false) ?? '';
    const targetId = body.targetId === null || body.targetId === undefined ? null : str(body, 'targetId');

    return mutate(({ db, audit, id: newId }) => {
      const snapshot = latestSnapshot(db, id);
      if (!snapshot) bad('Nothing has been published for this engagement yet');

      // What the client may do is governed by the snapshot they are responding to.
      const allowed: Record<SubmissionKind, boolean> = {
        comment: snapshot.selection.allowComments,
        ranking: snapshot.selection.allowRanking,
        edit: snapshot.selection.allowComments,
        dependency_suggestion: snapshot.selection.allowDependencySuggestions,
        timing_feedback: snapshot.selection.allowTimingFeedback,
      };
      if (!allowed[kind]) {
        bad(`Version ${snapshot.version} does not invite ${kind.replace(/_/g, ' ')} feedback`);
      }
      if (kind === 'comment' && bodyText.trim() === '') bad('A comment needs a body');

      if (kind === 'ranking') {
        const rank = (body.payload as { clientRank?: unknown } | undefined)?.clientRank;
        if (typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1) {
          bad('A ranking submission needs payload.clientRank as a positive integer');
        }
        if (!targetId) bad('A ranking submission needs a targetId');
      }
      if (kind === 'timing_feedback') {
        const waveId = (body.payload as { waveId?: unknown } | undefined)?.waveId;
        if (typeof waveId !== 'string') bad('Timing feedback needs payload.waveId');
        if (!targetId) bad('Timing feedback needs the initiative as targetId');
      }
      if (kind === 'dependency_suggestion') {
        const p = (body.payload ?? {}) as Record<string, unknown>;
        if (typeof p.fromInitiativeId !== 'string' || typeof p.toInitiativeId !== 'string') {
          bad('A dependency suggestion needs payload.fromInitiativeId and payload.toInitiativeId');
        }
      }

      const submission: ClientSubmission = {
        id: newId('sub'),
        engagementId: id,
        snapshotVersion: snapshot.version,
        kind,
        targetType,
        targetId: targetId ?? null,
        body: bodyText,
        payload: body.payload ?? null,
        submittedBy: user.id,
        submittedByName: user.name,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
        appliedChange: null,
      };
      db.clientSubmissions.push(submission);

      audit({
        engagementId: id,
        actorId: user.id,
        actorName: user.name,
        action: 'submission.created',
        targetType: 'client_submission',
        targetId: submission.id,
        detail: `${user.name} raised ${kind.replace(/_/g, ' ')} feedback on ${targetType} ${targetId ?? '(none)'} against version ${snapshot.version}.`,
      });

      return { submission };
    });
  });
}
