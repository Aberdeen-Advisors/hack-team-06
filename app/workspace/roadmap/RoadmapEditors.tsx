'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Field, Select, Textarea, useToast } from '@/components/ui';

export interface Option {
  id: string;
  label: string;
}

/**
 * Wave assignment. Changing the select PATCHes the initiative and refreshes, so the wave columns
 * and the feasibility table above them are both recomputed from the same working model.
 */
export function WaveSelect({
  engagementId,
  initiativeId,
  initiativeName,
  waves,
  current,
}: {
  engagementId: string;
  initiativeId: string;
  initiativeName: string;
  waves: Option[];
  current: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(current ?? '');

  async function assign(waveId: string) {
    const previous = value;
    setValue(waveId);
    setBusy(true);
    try {
      const response = await fetch(`/api/engagements/${engagementId}/initiatives/${initiativeId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ waveId: waveId === '' ? null : waveId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setValue(previous);
        toast(data.error ?? 'Could not move that initiative', 'error');
        return;
      }
      toast(
        `"${initiativeName}" moved to ${waves.find((w) => w.id === waveId)?.label ?? 'no wave'}.`,
        'success',
      );
      router.refresh();
    } catch {
      setValue(previous);
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Select
      aria-label={`Wave for ${initiativeName}`}
      data-testid={`wave-select-${initiativeId}`}
      disabled={busy}
      value={value}
      onChange={(event) => void assign(event.target.value)}
      className="max-w-[190px]"
    >
      <option value="">Not sequenced</option>
      {waves.map((wave) => (
        <option key={wave.id} value={wave.id}>
          {wave.label}
        </option>
      ))}
    </Select>
  );
}

/** Removes a dependency. The feasibility list re-renders from the same refresh. */
export function DeleteDependencyButton({
  engagementId,
  dependencyId,
  label,
}: {
  engagementId: string;
  dependencyId: string;
  label: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/engagements/${engagementId}/dependencies/${dependencyId}`,
        { method: 'DELETE' },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast(data.error ?? 'Could not remove that dependency', 'error');
        return;
      }
      toast(`Removed the dependency ${label}.`, 'info');
      router.refresh();
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="danger"
      data-testid={`delete-dependency-${dependencyId}`}
      aria-label={`Remove dependency ${label}`}
      disabled={busy}
      onClick={() => void remove()}
    >
      {busy ? 'Removing…' : 'Remove'}
    </Button>
  );
}

const TYPES: { value: string; label: string }[] = [
  { value: 'finish_to_start', label: 'Finish to start' },
  { value: 'start_to_start', label: 'Start to start' },
  { value: 'enables', label: 'Enables' },
  { value: 'shares_resource', label: 'Shares resource' },
  { value: 'mutually_exclusive', label: 'Mutually exclusive' },
];

/** Creates a dependency. The API refuses one that would close a cycle; the error is surfaced. */
export function DependencyForm({
  engagementId,
  initiatives,
}: {
  engagementId: string;
  initiatives: Option[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(initiatives[0]?.id ?? '');
  const [to, setTo] = useState(initiatives[1]?.id ?? '');
  const [type, setType] = useState('finish_to_start');
  const [strength, setStrength] = useState('hard');
  const [rationale, setRationale] = useState('');

  async function create() {
    setBusy(true);
    try {
      const response = await fetch(`/api/engagements/${engagementId}/dependencies`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fromInitiativeId: from,
          toInitiativeId: to,
          type,
          strength,
          source: 'workshop',
          rationale,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast(data.error ?? 'Could not add that dependency', 'error');
        return;
      }
      toast('Dependency added.', 'success');
      setRationale('');
      router.refresh();
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void create();
      }}
    >
      <Field label="This must happen first" htmlFor="dep-from">
        <Select
          id="dep-from"
          data-testid="dep-from"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        >
          {initiatives.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Before this" htmlFor="dep-to">
        <Select
          id="dep-to"
          data-testid="dep-to"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        >
          {initiatives.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Type" htmlFor="dep-type">
        <Select
          id="dep-type"
          data-testid="dep-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Strength"
        htmlFor="dep-strength"
        hint="Hard dependencies constrain the earliest wave an initiative can occupy; soft ones are advisory."
      >
        <Select
          id="dep-strength"
          data-testid="dep-strength"
          value={strength}
          onChange={(event) => setStrength(event.target.value)}
        >
          <option value="hard">hard</option>
          <option value="soft">soft</option>
        </Select>
      </Field>
      <Field label="Rationale" htmlFor="dep-rationale" className="md:col-span-2">
        <Textarea
          id="dep-rationale"
          data-testid="dep-rationale"
          rows={2}
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
          placeholder="Why one has to precede the other."
        />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" variant="primary" data-testid="add-dependency" disabled={busy}>
          {busy ? 'Adding…' : 'Add dependency'}
        </Button>
      </div>
    </form>
  );
}
