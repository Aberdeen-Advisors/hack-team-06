'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, useToast } from '@/components/ui';

export function SuggestionActions({
  engagementId,
  suggestionId,
  label,
}: {
  engagementId: string;
  suggestionId: string;
  label: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  async function review(status: 'accepted' | 'rejected') {
    setBusy(status === 'accepted' ? 'accept' : 'reject');
    try {
      const response = await fetch(
        `/api/engagements/${engagementId}/ai-suggestions/${suggestionId}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );
      const data = (await response.json()) as { appliedChange?: string | null; error?: string };
      if (!response.ok) {
        toast(data.error ?? 'Could not record that decision', 'error');
        return;
      }
      toast(
        status === 'accepted'
          ? (data.appliedChange ?? `${label} accepted.`)
          : `${label} rejected — nothing in the model changed.`,
        status === 'accepted' ? 'success' : 'info',
      );
      router.refresh();
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="primary"
        disabled={busy !== null}
        onClick={() => void review('accepted')}
      >
        {busy === 'accept' ? 'Applying…' : 'Accept'}
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={busy !== null}
        onClick={() => void review('rejected')}
      >
        {busy === 'reject' ? 'Rejecting…' : 'Reject'}
      </Button>
    </div>
  );
}
