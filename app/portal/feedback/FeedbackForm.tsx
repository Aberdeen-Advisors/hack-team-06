'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Field, Input, Select, Textarea, useToast } from '@/components/ui';

export interface FeedbackOption {
  id: string;
  label: string;
}

export function FeedbackForm({
  engagementId,
  opportunities,
  initiatives,
  waves,
  allow,
}: {
  engagementId: string;
  opportunities: FeedbackOption[];
  initiatives: FeedbackOption[];
  waves: FeedbackOption[];
  allow: {
    comments: boolean;
    ranking: boolean;
    timing: boolean;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const [commentTarget, setCommentTarget] = useState(opportunities[0]?.id ?? '');
  const [commentBody, setCommentBody] = useState('');
  const [rankTarget, setRankTarget] = useState(opportunities[0]?.id ?? '');
  const [rank, setRank] = useState('1');
  const [timingInitiative, setTimingInitiative] = useState(initiatives[0]?.id ?? '');
  const [timingWave, setTimingWave] = useState(waves[0]?.id ?? '');
  const [timingBody, setTimingBody] = useState('');

  async function submit(payload: Record<string, unknown>, success: string, reset: () => void) {
    setBusy(true);
    try {
      const response = await fetch(`/api/engagements/${engagementId}/submissions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast(data.error ?? 'Could not send that', 'error');
        return;
      }
      toast(success, 'success');
      reset();
      router.refresh();
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {allow.comments && opportunities.length > 0 ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(
              {
                kind: 'comment',
                targetType: 'opportunity',
                targetId: commentTarget,
                body: commentBody,
              },
              'Comment sent to your advisory team.',
              () => setCommentBody(''),
            );
          }}
        >
          <h3 className="text-[16px]">Comment on an opportunity</h3>
          <Field label="Opportunity" htmlFor="comment-target">
            <Select
              id="comment-target"
              value={commentTarget}
              onChange={(event) => setCommentTarget(event.target.value)}
            >
              {opportunities.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Your comment" htmlFor="comment-body">
            <Textarea
              id="comment-body"
              rows={4}
              required
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="What is missing, wrong, or needs a caveat?"
            />
          </Field>
          <Button type="submit" variant="primary" disabled={busy || commentBody.trim() === ''}>
            {busy ? 'Sending…' : 'Send comment'}
          </Button>
        </form>
      ) : null}

      <div className="space-y-8">
        {allow.ranking && opportunities.length > 0 ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(
                {
                  kind: 'ranking',
                  targetType: 'opportunity',
                  targetId: rankTarget,
                  body: `Ranked at position ${rank}`,
                  payload: { clientRank: Number(rank) },
                },
                'Ranking sent to your advisory team.',
                () => setRank('1'),
              );
            }}
          >
            <h3 className="text-[16px]">Rank an opportunity</h3>
            <Field label="Opportunity" htmlFor="rank-target">
              <Select
                id="rank-target"
                value={rankTarget}
                onChange={(event) => setRankTarget(event.target.value)}
              >
                {opportunities.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Your position"
              htmlFor="rank-value"
              hint="1 is the most important to your business."
            >
              <Input
                id="rank-value"
                type="number"
                min={1}
                max={40}
                value={rank}
                onChange={(event) => setRank(event.target.value)}
                className="max-w-[120px]"
              />
            </Field>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send ranking'}
            </Button>
          </form>
        ) : null}

        {allow.timing && initiatives.length > 0 && waves.length > 0 ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(
                {
                  kind: 'timing_feedback',
                  targetType: 'initiative',
                  targetId: timingInitiative,
                  body: timingBody,
                  payload: { waveId: timingWave },
                },
                'Timing feedback sent to your advisory team.',
                () => setTimingBody(''),
              );
            }}
          >
            <h3 className="text-[16px]">Ask for different timing</h3>
            <Field label="Initiative" htmlFor="timing-init">
              <Select
                id="timing-init"
                value={timingInitiative}
                onChange={(event) => setTimingInitiative(event.target.value)}
              >
                {initiatives.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Move it to" htmlFor="timing-wave">
              <Select
                id="timing-wave"
                value={timingWave}
                onChange={(event) => setTimingWave(event.target.value)}
              >
                {waves.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Why" htmlFor="timing-body">
              <Textarea
                id="timing-body"
                rows={3}
                value={timingBody}
                onChange={(event) => setTimingBody(event.target.value)}
                placeholder="What makes the current timing difficult?"
              />
            </Field>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send timing feedback'}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
