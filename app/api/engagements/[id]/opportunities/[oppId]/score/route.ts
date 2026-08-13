import { aberdeenOnly, anchor, bad, handle, readJson } from '@/lib/api';
import { deriveOpportunity } from '@/lib/calc';
import { mutate } from '@/lib/store';
import { DIMENSION_KEYS } from '@/lib/types';
import type { DimensionKey } from '@/lib/types';

type Params = { params: Promise<{ id: string; oppId: string }> };

function rationaleFrom(input: unknown, fallback: Record<DimensionKey, string>): Record<DimensionKey, string> {
  const raw = (input ?? {}) as Record<string, unknown>;
  const out = {} as Record<DimensionKey, string>;
  for (const key of DIMENSION_KEYS) {
    out[key] = typeof raw[key] === 'string' ? (raw[key] as string) : fallback[key] ?? '';
  }
  return out;
}

/**
 * Aberdeen only: set the three integer dimension scores. Derived values are recomputed for the
 * response and never stored.
 */
export async function PUT(request: Request, { params }: Params) {
  const { id, oppId } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);
    const financialImpact = anchor(body, 'financialImpact');
    const riskIfDeferred = anchor(body, 'riskIfDeferred');
    const strategicAlignment = anchor(body, 'strategicAlignment');

    return mutate(({ db, audit, id: newId }) => {
      const engagement = db.engagements.find((e) => e.id === id);
      if (!engagement) bad(`Unknown engagement ${id}`);
      const opp = db.opportunities.find((o) => o.id === oppId && o.engagementId === id);
      if (!opp) bad(`Unknown opportunity ${oppId}`);
      const model = db.scoringModels.find((m) => m.id === engagement.scoringModelId);
      if (!model) bad('Engagement has no scoring model');

      let score = db.opportunityScores.find((s) => s.opportunityId === opp.id);
      const previous = score
        ? { fi: score.financialImpact, rd: score.riskIfDeferred, sa: score.strategicAlignment }
        : null;
      const rationale = rationaleFrom(
        body.rationale,
        score?.rationale ?? { financial_impact: '', risk_if_deferred: '', strategic_alignment: '' },
      );

      if (!score) {
        score = {
          id: newId('oscore'),
          opportunityId: opp.id,
          scoringModelId: model.id,
          financialImpact,
          riskIfDeferred,
          strategicAlignment,
          rationale,
          evidenceIds: { financial_impact: [], risk_if_deferred: [], strategic_alignment: [] },
          scoredBy: user.name,
          scoredAt: new Date().toISOString(),
        };
        db.opportunityScores.push(score);
      } else {
        score.financialImpact = financialImpact;
        score.riskIfDeferred = riskIfDeferred;
        score.strategicAlignment = strategicAlignment;
        score.rationale = rationale;
        score.scoredBy = user.name;
        score.scoredAt = new Date().toISOString();
        score.scoringModelId = model.id;
      }

      const derived = deriveOpportunity(score, model);
      audit({
        engagementId: id,
        actorId: user.id,
        actorName: user.name,
        action: 'opportunity.scored',
        targetType: 'opportunity',
        targetId: opp.id,
        detail: previous
          ? `Rescored ${opp.displayCode} from ${previous.fi}/${previous.rd}/${previous.sa} to ${financialImpact}/${riskIfDeferred}/${strategicAlignment} (weighted ${derived.weighted}, ${derived.band}).`
          : `Scored ${opp.displayCode} at ${financialImpact}/${riskIfDeferred}/${strategicAlignment} (weighted ${derived.weighted}, ${derived.band}).`,
      });

      return { score, derived };
    });
  });
}
