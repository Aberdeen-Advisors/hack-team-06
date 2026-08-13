import { aberdeenOnly, bad, handle, oneOf, readJson, str } from '@/lib/api';
import { feasibilityIssues } from '@/lib/calc';
import { mutate } from '@/lib/store';
import { T_SHIRT_SIZES } from '@/lib/types';
import type { TShirtSize } from '@/lib/types';

type Params = { params: Promise<{ id: string; initId: string }> };

/** Aberdeen only: edit initiative fields, including wave assignment, size and owner. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, initId } = await params;
  return handle(async () => {
    const user = await aberdeenOnly(id);
    const body = await readJson(request);

    return mutate(({ db, audit }) => {
      const init = db.initiatives.find((i) => i.id === initId && i.engagementId === id);
      if (!init) bad(`Unknown initiative ${initId}`);
      const changed: string[] = [];

      const name = str(body, 'name', false);
      if (name !== undefined && name !== init.name) {
        init.name = name;
        changed.push('name');
      }
      const description = str(body, 'description', false);
      if (description !== undefined && description !== init.description) {
        init.description = description;
        changed.push('description');
      }
      const owner = str(body, 'owner', false);
      if (owner !== undefined && owner !== init.owner) {
        init.owner = owner;
        changed.push('owner');
      }
      const targetOutcome = str(body, 'targetOutcome', false);
      if (targetOutcome !== undefined && targetOutcome !== init.targetOutcome) {
        init.targetOutcome = targetOutcome;
        changed.push('targetOutcome');
      }
      const workstream = str(body, 'workstream', false);
      if (workstream !== undefined && workstream !== init.workstream) {
        init.workstream = workstream;
        changed.push('workstream');
      }
      const size = oneOf<TShirtSize>(body, 'tShirtSize', T_SHIRT_SIZES, false);
      if (size !== undefined && size !== init.tShirtSize) {
        init.tShirtSize = size;
        changed.push('tShirtSize');
      }
      if (body.themeId !== undefined) {
        const themeId = str(body, 'themeId') as string;
        const theme = db.themes.find((t) => t.id === themeId && t.engagementId === id);
        if (!theme) bad(`Unknown theme ${themeId}`);
        if (themeId !== init.themeId) {
          init.themeId = themeId;
          changed.push('themeId');
        }
      }
      if (body.waveId !== undefined) {
        const waveId = body.waveId;
        if (waveId !== null) {
          if (typeof waveId !== 'string') bad('"waveId" must be a wave id or null');
          const wave = db.waves.find((w) => w.id === waveId && w.engagementId === id);
          if (!wave) bad(`Unknown wave ${String(waveId)}`);
        }
        if (waveId !== init.waveId) {
          init.waveId = waveId as string | null;
          changed.push('waveId');
        }
      }

      if (changed.length > 0) {
        audit({
          engagementId: id,
          actorId: user.id,
          actorName: user.name,
          action: 'initiative.updated',
          targetType: 'initiative',
          targetId: init.id,
          detail: `Updated "${init.name}": ${changed.join(', ')}.`,
        });
      }

      const scoped = <T extends { engagementId: string }>(rows: T[]) =>
        rows.filter((r) => r.engagementId === id);
      return {
        initiative: init,
        changed,
        feasibility: feasibilityIssues(
          scoped(db.initiatives),
          scoped(db.dependencies),
          scoped(db.waves),
        ),
      };
    });
  });
}
