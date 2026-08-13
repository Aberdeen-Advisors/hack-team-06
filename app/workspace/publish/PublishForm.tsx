'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Field, Textarea, useToast } from '@/components/ui';
import type { PublishSelection } from '@/lib/types';

const CONTENT_KEYS: { key: keyof PublishSelection; label: string; hint: string }[] = [
  { key: 'includeCurrentState', label: 'Current state', hint: 'Findings and the evidence behind them' },
  { key: 'includeMaturityHeatmap', label: 'Maturity heatmap', hint: 'Current and target levels by focus area' },
  { key: 'includeOpportunities', label: 'Opportunity register', hint: 'The opportunities themselves' },
  { key: 'includeScores', label: 'Scores', hint: 'Dimension scores, weighted score, band and quadrant' },
  { key: 'includeInitiatives', label: 'Initiatives', hint: 'Initiatives and their rollups' },
  { key: 'includeRoadmap', label: 'Roadmap', hint: 'Waves and dependencies' },
  { key: 'includeDecisions', label: 'Decision log', hint: 'Decisions taken and why' },
];

const PERMISSION_KEYS: { key: keyof PublishSelection; label: string; hint: string }[] = [
  { key: 'allowComments', label: 'Comments', hint: 'The client can comment on what they see' },
  { key: 'allowRanking', label: 'Ranking', hint: 'The client can rank the opportunities that matter most' },
  {
    key: 'allowDependencySuggestions',
    label: 'Dependency suggestions',
    hint: 'The client can propose a dependency between initiatives',
  },
  {
    key: 'allowTimingFeedback',
    label: 'Timing feedback',
    hint: 'The client can ask for an initiative to move wave',
  },
];

export function PublishForm({
  engagementId,
  nextVersion,
  initialSelection,
}: {
  engagementId: string;
  nextVersion: number;
  initialSelection: PublishSelection;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selection, setSelection] = useState<PublishSelection>(initialSelection);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (key: keyof PublishSelection) =>
    setSelection((current) => ({ ...current, [key]: !current[key] }));

  async function publish() {
    setBusy(true);
    try {
      const response = await fetch(`/api/engagements/${engagementId}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selection, note }),
      });
      const data = (await response.json()) as {
        snapshot?: { version: number };
        error?: string;
      };
      if (!response.ok || !data.snapshot) {
        toast(data.error ?? 'Publish failed', 'error');
        return;
      }
      toast(`Published version ${data.snapshot.version} to the client portal.`, 'success');
      setNote('');
      router.refresh();
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-8 md:grid-cols-2">
        <fieldset>
          <legend className="label mb-3">What the client sees</legend>
          <div className="space-y-2.5">
            {CONTENT_KEYS.map((item) => (
              <Checkbox
                key={item.key}
                label={item.label}
                hint={item.hint}
                checked={selection[item.key]}
                onChange={() => toggle(item.key)}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-3">What the client may do</legend>
          <div className="space-y-2.5">
            {PERMISSION_KEYS.map((item) => (
              <Checkbox
                key={item.key}
                label={item.label}
                hint={item.hint}
                checked={selection[item.key]}
                onChange={() => toggle(item.key)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <Field
        label={`Note on version ${nextVersion}`}
        htmlFor="publish-note"
        hint="Shown to the client alongside the version banner."
      >
        <Textarea
          id="publish-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What changed since the last version, and what you would like the client to respond to."
        />
      </Field>

      <div className="flex items-center gap-4">
        <Button variant="primary" disabled={busy} onClick={() => void publish()}>
          {busy ? 'Publishing…' : `Publish version ${nextVersion}`}
        </Button>
        <p className="text-[12.5px] text-[var(--color-slate)]">
          Publishing freezes a copy of exactly what is ticked, plus the derived values as they are
          right now. Later edits do not change a published version.
        </p>
      </div>
    </div>
  );
}

function Checkbox({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-3.5 w-3.5 accent-[var(--color-ink)]"
      />
      <span>
        <span className="text-[14px] font-medium">{label}</span>
        <span className="block text-[12.5px] text-[var(--color-slate)]">{hint}</span>
      </span>
    </label>
  );
}
