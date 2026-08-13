'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Field, Select, Textarea, useToast } from '@/components/ui';
import type { AnchorScore, DimensionKey, ScoringDimension } from '@/lib/types';

export interface ScoreFormDimension {
  key: DimensionKey;
  label: string;
  weight: number;
  anchors: ScoringDimension['anchors'];
}

const FIELD_BY_KEY: Record<DimensionKey, 'financialImpact' | 'riskIfDeferred' | 'strategicAlignment'> = {
  financial_impact: 'financialImpact',
  risk_if_deferred: 'riskIfDeferred',
  strategic_alignment: 'strategicAlignment',
};

/**
 * Sets the three integer dimension scores. Nothing derived is sent: the weighted score, band and
 * quadrant are recomputed server-side on the next render, which is what `router.refresh()` fetches.
 */
export function ScoreForm({
  engagementId,
  opportunityId,
  dimensions,
  initial,
  initialRationale,
}: {
  engagementId: string;
  opportunityId: string;
  dimensions: ScoreFormDimension[];
  initial: Record<DimensionKey, AnchorScore>;
  initialRationale: Record<DimensionKey, string>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<DimensionKey, AnchorScore>>(initial);
  const [rationale, setRationale] = useState<Record<DimensionKey, string>>(initialRationale);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/engagements/${engagementId}/opportunities/${opportunityId}/score`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            financialImpact: scores.financial_impact,
            riskIfDeferred: scores.risk_if_deferred,
            strategicAlignment: scores.strategic_alignment,
            rationale,
          }),
        },
      );
      const data = (await response.json()) as {
        derived?: { weighted: number; band: string };
        error?: string;
      };
      if (!response.ok || !data.derived) {
        toast(data.error ?? 'Could not save that score', 'error');
        return;
      }
      toast(
        `Saved. Weighted score ${data.derived.weighted.toFixed(2)} — ${data.derived.band}.`,
        'success',
      );
      router.refresh();
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-3">
        {dimensions.map((dimension) => (
          <div key={dimension.key} className="space-y-3">
            <Field
              label={`${dimension.label} · ${(dimension.weight * 100).toFixed(0)}%`}
              htmlFor={`score-${dimension.key}`}
              hint={
                dimension.anchors.find((a) => a.score === scores[dimension.key])?.definition ?? ''
              }
            >
              <Select
                id={`score-${dimension.key}`}
                data-testid={`score-${FIELD_BY_KEY[dimension.key]}`}
                value={String(scores[dimension.key])}
                onChange={(event) =>
                  setScores((current) => ({
                    ...current,
                    [dimension.key]: Number(event.target.value) as AnchorScore,
                  }))
                }
              >
                {[5, 4, 3, 2, 1].map((score) => (
                  <option key={score} value={score}>
                    {score} — {dimension.anchors.find((a) => a.score === score)?.label ?? score}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Why this score" htmlFor={`rationale-${dimension.key}`}>
              <Textarea
                id={`rationale-${dimension.key}`}
                rows={3}
                value={rationale[dimension.key]}
                onChange={(event) =>
                  setRationale((current) => ({ ...current, [dimension.key]: event.target.value }))
                }
                placeholder="The evidence that puts it at this anchor."
              />
            </Field>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          data-testid="save-score"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? 'Saving…' : 'Save scores'}
        </Button>
        <p className="text-[12.5px] text-[var(--color-slate)]">
          Only these three integers are stored. The weighted score, band, axes and quadrant above are
          recomputed on every read.
        </p>
      </div>
    </div>
  );
}
