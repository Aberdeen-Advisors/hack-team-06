import { anyRole, handle } from '@/lib/api';
import { getPublishedSnapshot } from '@/lib/view';

type Params = { params: Promise<{ id: string }> };

/**
 * Both roles: the latest published snapshot. A client user only ever receives snapshot data —
 * there is no route that hands them live working data.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    const { role } = await anyRole(id);
    const snapshot = getPublishedSnapshot(id);
    return { snapshot, role };
  });
}
