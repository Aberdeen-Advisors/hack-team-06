import { aberdeenOnly, bad, handle, oneOf, readJson, str } from '@/lib/api';
import { detectCycles, feasibilityIssues } from '@/lib/calc';
import { mutate } from '@/lib/store';
import type { Dependency, DependencySource, DependencyStrength, DependencyType } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

const TYPES: DependencyType[] = [
  'finish_to_start',
  'start_to_start',
  'enables',
  'shares_resource',
  'mutually_exclusive',
];
const SOURCES: DependencySource[] = ['workshop', 'ai_inferred', 'architecture', 'client_suggested'];
const STRENGTHS: DependencyStrength[] = ['hard', 'soft'];

/** Aberdeen only: create a dependency. A dependency that would close a cycle is refused. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);
    const fromInitiativeId = str(body, 'fromInitiativeId') as string;
    const toInitiativeId = str(body, 'toInitiativeId') as string;
    const type = oneOf<DependencyType>(body, 'type', TYPES) as DependencyType;
    const strength = oneOf<DependencyStrength>(body, 'strength', STRENGTHS) as DependencyStrength;
    const source = (oneOf<DependencySource>(body, 'source', SOURCES, false) ??
      'workshop') as DependencySource;
    const rationale = str(body, 'rationale', false) ?? '';

    return mutate(({ db, audit, id: newId }) => {
      if (fromInitiativeId === toInitiativeId) bad('An initiative cannot depend on itself');
      const from = db.initiatives.find((i) => i.id === fromInitiativeId && i.engagementId === id);
      const to = db.initiatives.find((i) => i.id === toInitiativeId && i.engagementId === id);
      if (!from) bad(`Unknown initiative ${fromInitiativeId}`);
      if (!to) bad(`Unknown initiative ${toInitiativeId}`);
      const duplicate = db.dependencies.find(
        (d) =>
          d.engagementId === id &&
          d.fromInitiativeId === fromInitiativeId &&
          d.toInitiativeId === toInitiativeId &&
          d.type === type,
      );
      if (duplicate) bad('That dependency already exists');

      const dependency: Dependency = {
        id: newId('dep'),
        engagementId: id,
        fromInitiativeId,
        toInitiativeId,
        type,
        rationale,
        source,
        strength,
      };

      const scopedDeps = db.dependencies.filter((d) => d.engagementId === id);
      const cycles = detectCycles([...scopedDeps, dependency]);
      if (cycles.length > detectCycles(scopedDeps).length) {
        bad(
          `That dependency would create a circular chain: ${cycles[cycles.length - 1]
            .map((cid) => db.initiatives.find((i) => i.id === cid)?.name ?? cid)
            .join(' -> ')}`,
        );
      }

      db.dependencies.push(dependency);
      audit({
        engagementId: id,
        actorId: user.id,
        actorName: user.name,
        action: 'dependency.created',
        targetType: 'dependency',
        targetId: dependency.id,
        detail: `Added ${strength} ${type.replace(/_/g, ' ')} dependency: "${from.name}" -> "${to.name}".`,
      });

      const scoped = <T extends { engagementId: string }>(rows: T[]) =>
        rows.filter((r) => r.engagementId === id);
      return {
        dependency,
        feasibility: feasibilityIssues(
          scoped(db.initiatives),
          scoped(db.dependencies),
          scoped(db.waves),
        ),
      };
    });
  });
}
