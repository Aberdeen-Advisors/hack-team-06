import { aberdeenOnly, handle } from '@/lib/api';
import { storageMode } from '@/lib/store';
import { buildEngagementView } from '@/lib/view';

type Params = { params: Promise<{ id: string }> };

/** Aberdeen only: the full working model plus every derived value. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    await aberdeenOnly(id);
    return { view: buildEngagementView(id), storageMode: storageMode() };
  });
}
