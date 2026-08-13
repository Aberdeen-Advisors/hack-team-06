import { aberdeenOnly, bad, handle } from '@/lib/api';
import { feasibilityIssues } from '@/lib/calc';
import { mutate } from '@/lib/store';

type Params = { params: Promise<{ id: string; depId: string }> };

/** Aberdeen only: remove a dependency. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id, depId } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    return mutate(({ db, audit }) => {
      const index = db.dependencies.findIndex((d) => d.id === depId && d.engagementId === id);
      if (index === -1) bad(`Unknown dependency ${depId}`);
      const [removed] = db.dependencies.splice(index, 1);
      const nameOf = (initId: string) =>
        db.initiatives.find((i) => i.id === initId)?.name ?? initId;
      audit({
        engagementId: id,
        actorId: user.id,
        actorName: user.name,
        action: 'dependency.deleted',
        targetType: 'dependency',
        targetId: removed.id,
        detail: `Removed ${removed.strength} ${removed.type.replace(/_/g, ' ')} dependency: "${nameOf(removed.fromInitiativeId)}" -> "${nameOf(removed.toInitiativeId)}".`,
      });
      const scoped = <T extends { engagementId: string }>(rows: T[]) =>
        rows.filter((r) => r.engagementId === id);
      return {
        removed,
        feasibility: feasibilityIssues(
          scoped(db.initiatives),
          scoped(db.dependencies),
          scoped(db.waves),
        ),
      };
    });
  });
}
