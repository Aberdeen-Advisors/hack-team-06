import { aberdeenOnly, bad, handle, oneOf, readJson, str } from '@/lib/api';
import { deriveOpportunity } from '@/lib/calc';
import { mutate } from '@/lib/store';
import { T_SHIRT_SIZES } from '@/lib/types';
import type { OpportunityStatus, RelationshipType, TShirtSize } from '@/lib/types';

type Params = { params: Promise<{ id: string; oppId: string }> };

const RELATIONSHIPS: RelationshipType[] = ['Internal', 'B2B', 'B2C', 'B2B2C'];
const STATUSES: OpportunityStatus[] = ['New', 'Existing', 'Updated'];

/** Aberdeen only: edit opportunity fields. Theme is never editable here — it derives from the initiative. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, oppId } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);

    return mutate(({ db, audit }) => {
      const opp = db.opportunities.find((o) => o.id === oppId && o.engagementId === id);
      if (!opp) bad(`Unknown opportunity ${oppId}`);
      const changed: string[] = [];

      const title = str(body, 'title', false);
      if (title !== undefined && title !== opp.title) {
        opp.title = title;
        changed.push('title');
      }
      const description = str(body, 'description', false);
      if (description !== undefined && description !== opp.description) {
        opp.description = description;
        changed.push('description');
      }
      const owner = str(body, 'owner', false);
      if (owner !== undefined && owner !== opp.owner) {
        opp.owner = owner;
        changed.push('owner');
      }
      const size = oneOf<TShirtSize>(body, 'tShirtSize', T_SHIRT_SIZES, false);
      if (size !== undefined && size !== opp.tShirtSize) {
        opp.tShirtSize = size;
        changed.push('tShirtSize');
      }
      const relationship = oneOf<RelationshipType>(body, 'relationshipType', RELATIONSHIPS, false);
      if (relationship !== undefined && relationship !== opp.relationshipType) {
        opp.relationshipType = relationship;
        changed.push('relationshipType');
      }
      const status = oneOf<OpportunityStatus>(body, 'status', STATUSES, false);
      if (status !== undefined && status !== opp.status) {
        opp.status = status;
        changed.push('status');
      }
      if (body.initiativeId !== undefined) {
        const initiativeId = str(body, 'initiativeId') as string;
        const initiative = db.initiatives.find((i) => i.id === initiativeId && i.engagementId === id);
        if (!initiative) bad(`Unknown initiative ${initiativeId}`);
        if (initiativeId !== opp.initiativeId) {
          opp.initiativeId = initiativeId;
          changed.push('initiativeId');
        }
      }
      if (body.capabilityAreaId !== undefined) {
        const capabilityAreaId = str(body, 'capabilityAreaId') as string;
        const area = db.capabilityAreas.find(
          (c) => c.id === capabilityAreaId && c.engagementId === id,
        );
        if (!area) bad(`Unknown capability area ${capabilityAreaId}`);
        if (capabilityAreaId !== opp.capabilityAreaId) {
          opp.capabilityAreaId = capabilityAreaId;
          changed.push('capabilityAreaId');
        }
      }
      if (body.clientRank !== undefined) {
        const rank = body.clientRank;
        if (rank !== null && (typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1)) {
          bad('"clientRank" must be a positive integer or null');
        }
        opp.clientRank = rank as number | null;
        changed.push('clientRank');
      }

      if (changed.length > 0) {
        audit({
          engagementId: id,
          actorId: user.id,
          actorName: user.name,
          action: 'opportunity.updated',
          targetType: 'opportunity',
          targetId: opp.id,
          detail: `Updated ${opp.displayCode}: ${changed.join(', ')}.`,
        });
      }

      const model = db.scoringModels.find((m) => m.id === db.engagements.find((e) => e.id === id)?.scoringModelId);
      const score = db.opportunityScores.find((s) => s.opportunityId === opp.id);
      return {
        opportunity: opp,
        changed,
        derived: score && model ? deriveOpportunity(score, model) : null,
      };
    });
  });
}
