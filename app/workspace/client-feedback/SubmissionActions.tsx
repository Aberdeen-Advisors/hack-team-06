'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Input, useToast } from '@/components/ui';

export function SubmissionActions({
  engagementId,
  submissionId,
}: {
  engagementId: string;
  submissionId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  async function review(status: 'accepted' | 'rejected') {
    setBusy(status === 'accepted' ? 'accept' : 'reject');
    try {
      const response = await fetch(
        `/api/engagements/${engagementId}/submissions/${submissionId}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status, reviewNote }),
        },
      );
      const data = (await response.json()) as { appliedChange?: string | null; error?: string };
      if (!response.ok) {
        toast(data.error ?? 'Could not record that decision', 'error');
        return;
      }
      toast(
        status === 'accepted'
          ? (data.appliedChange ?? 'Accepted.')
          : 'Rejected — the working model is unchanged.',
        status === 'accepted' ? 'success' : 'info',
      );
      setReviewNote('');
      router.refresh();
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        placeholder="Review note (optional)"
        className="max-w-[300px]"
        aria-label="Review note"
      />
      <Button
        size="sm"
        variant="primary"
        data-testid="accept-submission"
        disabled={busy !== null}
        onClick={() => void review('accepted')}
      >
        {busy === 'accept' ? 'Applying…' : 'Accept and apply'}
      </Button>
      <Button
        size="sm"
        variant="danger"
        data-testid="reject-submission"
        disabled={busy !== null}
        onClick={() => void review('rejected')}
      >
        {busy === 'reject' ? 'Rejecting…' : 'Reject'}
      </Button>
    </div>
  );
}
