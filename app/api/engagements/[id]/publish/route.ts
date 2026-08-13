import { aberdeenOnly, bad, handle, readJson, str } from '@/lib/api';
import { buildSnapshot, normalizeSelection } from '@/lib/publish';
import { mutate } from '@/lib/store';

type Params = { params: Promise<{ id: string }> };

/**
 * Aberdeen only: publish a new snapshot at version n+1.
 *
 * The snapshot is a frozen deep copy of exactly the entities the selection includes, plus the
 * derived values computed now. Later edits to working data never change an existing snapshot,
 * which is what makes the portal a published deliverable rather than a live view.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);
    const note = str(body, 'note', false) ?? '';
    const selection = normalizeSelection(body.selection);

    return mutate(({ db, audit }) => {
      const engagement = db.engagements.find((e) => e.id === id);
      if (!engagement) bad(`Unknown engagement ${id}`);
      const previous = db.publishedSnapshots
        .filter((s) => s.engagementId === id)
        .reduce((max, s) => Math.max(max, s.version), 0);
      const version = previous + 1;

      const snapshot = buildSnapshot({
        db,
        engagementId: id,
        selection,
        version,
        publishedBy: user.name,
        note,
      });
      db.publishedSnapshots.push(snapshot);
      engagement.publishedVersion = version;

      const included = (Object.entries(selection) as [string, boolean][])
        .filter(([key, value]) => value && key.startsWith('include'))
        .map(([key]) => key.replace('include', ''));

      audit({
        engagementId: id,
        actorId: user.id,
        actorName: user.name,
        action: 'snapshot.published',
        targetType: 'snapshot',
        targetId: snapshot.id,
        detail: `Published version ${version} with ${included.join(', ') || 'nothing'}: ${snapshot.payload.opportunities.length} opportunities, ${snapshot.payload.initiatives.length} initiatives, ${snapshot.payload.waves.length} waves.${note ? ` Note: ${note}` : ''}`,
      });

      return { snapshot };
    });
  });
}
