import { aberdeenOnly, handle } from '@/lib/api';
import { getDb } from '@/lib/store';

/** Aberdeen only: the list of engagements this consultant works on. */
export async function GET() {
  return handle(async () => {
    const user = await aberdeenOnly();
    const engagements = getDb().engagements.filter((e) => user.engagementIds.includes(e.id));
    return { engagements };
  });
}
