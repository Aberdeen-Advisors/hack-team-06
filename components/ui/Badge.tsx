import type { ReactNode } from 'react';

import type { BandLabel, QuadrantLabel, SubmissionStatus } from '@/lib/types';

export type BadgeTone =
  | 'critical'
  | 'high'
  | 'medium'
  | 'lower'
  | 'ink'
  | 'slate'
  | 'amber'
  | 'positive'
  | 'neutral';

const TONES: Record<BadgeTone, string> = {
  critical:
    'bg-[var(--color-critical-bg)] text-[var(--color-critical-ink)] border-[var(--color-critical-line)]',
  high: 'bg-[var(--color-high-bg)] text-[var(--color-high-ink)] border-[var(--color-high-line)]',
  medium:
    'bg-[var(--color-medium-bg)] text-[var(--color-medium-ink)] border-[var(--color-medium-line)]',
  lower: 'bg-[var(--color-lower-bg)] text-[var(--color-lower-ink)] border-[var(--color-lower-line)]',
  ink: 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]',
  slate: 'bg-[var(--color-canvas-deep)] text-[var(--color-ink-soft)] border-[var(--color-line-strong)]',
  amber: 'bg-[var(--color-amber-soft)] text-[var(--color-amber)] border-[var(--color-amber-line)]',
  positive:
    'bg-[var(--color-positive-bg)] text-[var(--color-positive-ink)] border-[var(--color-positive-line)]',
  neutral: 'bg-white text-[var(--color-slate)] border-[var(--color-line)]',
};

export const BAND_TONE: Record<BandLabel, BadgeTone> = {
  Critical: 'critical',
  'High Priority': 'high',
  'Medium Priority': 'medium',
  'Lower Priority': 'lower',
};

export const QUADRANT_TONE: Record<QuadrantLabel, BadgeTone> = {
  'Act Now': 'ink',
  Defend: 'slate',
  'Plan & Fund': 'amber',
  'Sequence Later': 'lower',
};

export const SUBMISSION_TONE: Record<SubmissionStatus, BadgeTone> = {
  pending: 'amber',
  accepted: 'positive',
  rejected: 'critical',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.07em] rounded-[2px] whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function BandBadge({ band }: { band: BandLabel | null }) {
  if (!band) return <Badge tone="neutral">Unscored</Badge>;
  return <Badge tone={BAND_TONE[band]}>{band}</Badge>;
}

export function QuadrantBadge({ quadrant }: { quadrant: QuadrantLabel | null }) {
  if (!quadrant) return <Badge tone="neutral">No quadrant</Badge>;
  return <Badge tone={QUADRANT_TONE[quadrant]}>{quadrant}</Badge>;
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return <Badge tone={SUBMISSION_TONE[status]}>{status}</Badge>;
}
