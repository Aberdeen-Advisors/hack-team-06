import { aberdeenOnly, handle } from '@/lib/api';
import { buildEngagementView } from '@/lib/view';

type Params = { params: Promise<{ id: string }> };

/** Aberdeen only: feasibility issues plus quadrant population for the current plan. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return handle(async () => {
    await aberdeenOnly(id);
    const view = buildEngagementView(id);
    return {
      issues: view.feasibility,
      quadrants: view.quadrants,
      cycles: view.cycles,
      earliestStarts: view.initiativeRows.map((row) => ({
        initiativeId: row.initiative.id,
        initiativeName: row.initiative.name,
        currentWaveSequence: row.wave?.sequence ?? null,
        earliestWaveSequence: row.earliestWaveSequence,
      })),
    };
  });
}
