import { aberdeenOnly, handle } from '@/lib/api';
import { getDb } from '@/lib/store';

type Params = { params: Promise<{ id: string }> };

/** Aberdeen only: the AI review queue. These are mocked model outputs (see modelVersion). */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    await aberdeenOnly(id);
    const suggestions = getDb().aiSuggestions.filter((s) => s.engagementId === id);
    return {
      suggestions,
      counts: {
        proposed: suggestions.filter((s) => s.status === 'proposed').length,
        accepted: suggestions.filter((s) => s.status === 'accepted').length,
        edited: suggestions.filter((s) => s.status === 'edited').length,
        rejected: suggestions.filter((s) => s.status === 'rejected').length,
      },
    };
  });
}
