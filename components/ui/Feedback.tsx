import type { ReactNode } from 'react';

import type { BandLabel, ConfidenceBand, MaturityLevel } from '@/lib/types';
import { CMMI_LEVELS } from '@/lib/types';

import { Badge } from './Badge';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-[var(--color-line-strong)] rounded-[4px] bg-white px-6 py-10 text-center">
      <p className="font-serif text-[17px]">{title}</p>
      {description ? (
        <p className="text-[13.5px] text-[var(--color-slate)] mt-1.5 max-w-[62ch] mx-auto">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

const BAND_STROKE: Record<BandLabel, string> = {
  Critical: 'var(--color-critical-ink)',
  'High Priority': 'var(--color-amber)',
  'Medium Priority': 'var(--color-medium-ink)',
  'Lower Priority': 'var(--color-slate-light)',
};

/**
 * The weighted score as a dial. Scores run 1..5, so the arc is drawn from 1 rather than 0 —
 * a 1.0 is the floor of the scale, not an absence of value.
 */
export function ScoreDial({
  value,
  band,
  size = 56,
  label,
}: {
  value: number | null;
  band?: BandLabel | null;
  size?: number;
  label?: string;
}) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = value === null ? 0 : Math.max(0, Math.min(1, (value - 1) / 4));
  const stroke = band ? BAND_STROKE[band] : 'var(--color-ink)';
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="butt"
          strokeDasharray={`${circumference * fraction} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size / 3.4}
          fill="var(--color-ink)"
          fontFamily="var(--font-serif)"
        >
          {value === null ? '—' : value.toFixed(2)}
        </text>
      </svg>
      {label ? <span className="label">{label}</span> : null}
    </div>
  );
}

/** A CMMI level with its name, or an explicit unassessed state. */
export function LevelPill({
  level,
  kind = 'current',
}: {
  level: MaturityLevel | null;
  kind?: 'current' | 'target';
}) {
  if (level === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-slate-light)]">
        <span className="inline-block w-4 text-center tabular">—</span> unassessed
      </span>
    );
  }
  const name = CMMI_LEVELS.find((l) => l.level === level)?.name ?? '';
  const filled = kind === 'current';
  return (
    <span
      title={`Level ${level} — ${name}`}
      className={`inline-flex items-center gap-1.5 border rounded-[2px] px-1.5 py-0.5 text-[12px] ${
        filled
          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
          : 'bg-white text-[var(--color-ink)] border-[var(--color-line-strong)]'
      }`}
    >
      <span className="tabular font-semibold">L{level}</span>
      <span className={filled ? 'text-white/80' : 'text-[var(--color-slate)]'}>{name}</span>
    </span>
  );
}

export function ConfidenceBadge({
  confidence,
  band,
}: {
  confidence: number;
  band: ConfidenceBand;
}) {
  const tone = band === 'high' ? 'positive' : band === 'medium' ? 'amber' : 'lower';
  return (
    <Badge tone={tone}>
      {band} · {Math.round(confidence * 100)}%
    </Badge>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-5">
      <div>
        {eyebrow ? <p className="label mb-1.5">{eyebrow}</p> : null}
        <h1 className="text-[26px]">{title}</h1>
        {description ? (
          <p className="text-[14px] text-[var(--color-slate)] mt-2 max-w-[80ch]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 no-print">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'amber' | 'critical';
}) {
  const accent =
    tone === 'amber'
      ? 'border-l-[var(--color-amber)]'
      : tone === 'critical'
        ? 'border-l-[var(--color-critical-ink)]'
        : 'border-l-[var(--color-ink)]';
  return (
    <div
      className={`bg-white border border-[var(--color-line)] border-l-2 ${accent} rounded-[3px] px-4 py-3`}
    >
      <p className="label">{label}</p>
      <p className="font-serif text-[26px] leading-tight mt-1 tabular">{value}</p>
      {hint ? <p className="text-[12.5px] text-[var(--color-slate)] mt-0.5">{hint}</p> : null}
    </div>
  );
}
