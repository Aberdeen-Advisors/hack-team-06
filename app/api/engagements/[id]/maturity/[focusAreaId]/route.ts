import { aberdeenOnly, bad, handle, readJson, str } from '@/lib/api';
import { capabilityAreaMaturity, maturityGap } from '@/lib/calc';
import { mutate } from '@/lib/store';
import type { MaturityLevel } from '@/lib/types';

type Params = { params: Promise<{ id: string; focusAreaId: string }> };

function level(value: unknown, key: string): MaturityLevel | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    bad(`"${key}" must be an integer from 1 to 5, or null`);
  }
  return value as MaturityLevel;
}

/** Aberdeen only: set current/target maturity levels and the rationale behind them. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, focusAreaId } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);

    return mutate(({ db, audit }) => {
      const focusArea = db.maturityFocusAreas.find(
        (f) => f.id === focusAreaId && f.engagementId === id,
      );
      if (!focusArea) bad(`Unknown maturity focus area ${focusAreaId}`);
      const changed: string[] = [];
      const before = { current: focusArea.currentLevel, target: focusArea.targetLevel };

      if (body.currentLevel !== undefined) {
        const next = level(body.currentLevel, 'currentLevel');
        if (next !== focusArea.currentLevel) {
          focusArea.currentLevel = next;
          changed.push('currentLevel');
        }
      }
      if (body.targetLevel !== undefined) {
        const next = level(body.targetLevel, 'targetLevel');
        if (next !== focusArea.targetLevel) {
          focusArea.targetLevel = next;
          changed.push('targetLevel');
        }
      }
      const rationale = str(body, 'rationale', false);
      if (rationale !== undefined && rationale !== focusArea.rationale) {
        focusArea.rationale = rationale;
        changed.push('rationale');
      }
      if (body.insufficientEvidence !== undefined) {
        if (typeof body.insufficientEvidence !== 'boolean') {
          bad('"insufficientEvidence" must be a boolean');
        }
        if (body.insufficientEvidence !== focusArea.insufficientEvidence) {
          focusArea.insufficientEvidence = body.insufficientEvidence;
          changed.push('insufficientEvidence');
        }
      }
      if (body.evidenceIds !== undefined) {
        if (!Array.isArray(body.evidenceIds) || body.evidenceIds.some((x) => typeof x !== 'string')) {
          bad('"evidenceIds" must be an array of evidence ids');
        }
        const known = new Set(db.evidence.filter((e) => e.engagementId === id).map((e) => e.id));
        for (const evidenceId of body.evidenceIds as string[]) {
          if (!known.has(evidenceId)) bad(`Unknown evidence ${evidenceId}`);
        }
        focusArea.evidenceIds = body.evidenceIds as string[];
        changed.push('evidenceIds');
      }

      if (changed.length > 0) {
        audit({
          engagementId: id,
          actorId: user.id,
          actorName: user.name,
          action: 'maturity.updated',
          targetType: 'maturity_focus_area',
          targetId: focusArea.id,
          detail: `"${focusArea.name}" moved from ${before.current ?? 'unassessed'}/${before.target ?? 'unassessed'} to ${focusArea.currentLevel ?? 'unassessed'}/${focusArea.targetLevel ?? 'unassessed'} (${changed.join(', ')}).`,
        });
      }

      const siblings = db.maturityFocusAreas.filter(
        (f) => f.engagementId === id && f.capabilityAreaId === focusArea.capabilityAreaId,
      );
      return {
        focusArea,
        changed,
        gap: maturityGap(focusArea),
        capabilityAreaMaturity: capabilityAreaMaturity(siblings),
      };
    });
  });
}
