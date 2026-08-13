/**
 * Conductor — calculation engine.
 *
 * Pure, deterministic, no I/O. Every derived number in the product comes from here; nothing
 * derived is ever persisted. If a number appears in the UI and is not typed by a consultant,
 * it must originate in this file.
 */

import type {
  BandLabel,
  Dependency,
  Initiative,
  MaturityFocusArea,
  MaturityLevel,
  Opportunity,
  OpportunityScore,
  QuadrantLabel,
  ScoringModel,
  TShirtSize,
  Theme,
  Wave,
} from './types';
import { BAND_LABELS, QUADRANT_LABELS, T_SHIRT_SIZES } from './types';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Dimension weights must sum to exactly 1.0 (within 1e-9) or the model is invalid. */
export function assertWeightsValid(model: ScoringModel): void {
  const sum = model.dimensions.reduce((acc, d) => acc + d.weight, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(
      `Scoring model "${model.id}" is invalid: dimension weights sum to ${sum}, expected 1.0`,
    );
  }
}

/** 1. Weighted score: sum of weight x dimension score, rounded to 2 decimals. */
export function weightedScore(score: OpportunityScore, model: ScoringModel): number {
  assertWeightsValid(model);
  let total = 0;
  for (const dim of model.dimensions) {
    if (dim.key === 'financial_impact') total += dim.weight * score.financialImpact;
    else if (dim.key === 'risk_if_deferred') total += dim.weight * score.riskIfDeferred;
    else if (dim.key === 'strategic_alignment') total += dim.weight * score.strategicAlignment;
  }
  return round2(total);
}

/** 2. Priority band: inclusive lower bounds, the highest matching band wins. */
export function priorityBand(weighted: number, model: ScoringModel): BandLabel {
  const sorted = [...model.bands].sort((a, b) => b.min - a.min);
  for (const band of sorted) {
    if (weighted >= band.min) return band.label;
  }
  return sorted[sorted.length - 1]?.label ?? 'Lower Priority';
}

/** 3. Business-value axis. */
export function businessValueAxis(score: OpportunityScore): number {
  return round2((score.strategicAlignment + score.financialImpact) / 2);
}

/** 4. Urgency axis. */
export function urgencyAxis(score: OpportunityScore): number {
  return score.riskIfDeferred;
}

/** 5. Quadrant at the model threshold (3.5 in the seeded model). */
export function quadrant(score: OpportunityScore, model: ScoringModel): QuadrantLabel {
  const t = model.quadrantThreshold;
  const value = businessValueAxis(score);
  const urgency = urgencyAxis(score);
  if (value >= t && urgency >= t) return 'Act Now';
  if (value < t && urgency >= t) return 'Defend';
  if (value >= t && urgency < t) return 'Plan & Fund';
  return 'Sequence Later';
}

export interface OpportunityDerived {
  weighted: number;
  band: BandLabel;
  businessValue: number;
  urgency: number;
  quadrant: QuadrantLabel;
}

/** Convenience bundle — the five derived values for one score. */
export function deriveOpportunity(score: OpportunityScore, model: ScoringModel): OpportunityDerived {
  const weighted = weightedScore(score, model);
  return {
    weighted,
    band: priorityBand(weighted, model),
    businessValue: businessValueAxis(score),
    urgency: urgencyAxis(score),
    quadrant: quadrant(score, model),
  };
}

/** 6. Maturity gap — null when either end is unassessed. */
export function maturityGap(focusArea: MaturityFocusArea): number | null {
  if (focusArea.currentLevel === null || focusArea.targetLevel === null) return null;
  return focusArea.targetLevel - focusArea.currentLevel;
}

export interface CapabilityAreaMaturity {
  meanCurrent: number | null;
  meanTarget: number | null;
  meanGap: number | null;
  countAssessed: number;
  countInsufficientEvidence: number;
  countTotal: number;
}

/**
 * 7. Roll up a set of focus areas. Unassessed areas are excluded from the means — they are
 * never treated as zero, which would silently understate current maturity.
 */
export function capabilityAreaMaturity(areas: MaturityFocusArea[]): CapabilityAreaMaturity {
  const currents = areas
    .map((a) => a.currentLevel)
    .filter((n): n is MaturityLevel => n !== null);
  const targets = areas.map((a) => a.targetLevel).filter((n): n is MaturityLevel => n !== null);
  const gaps = areas.map(maturityGap).filter((n): n is number => n !== null);
  const mean = (xs: number[]): number | null =>
    xs.length === 0 ? null : round2(xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    meanCurrent: mean(currents),
    meanTarget: mean(targets),
    meanGap: mean(gaps),
    countAssessed: areas.filter((a) => a.currentLevel !== null && a.targetLevel !== null).length,
    countInsufficientEvidence: areas.filter((a) => a.insufficientEvidence).length,
    countTotal: areas.length,
  };
}

function maxTShirt(sizes: TShirtSize[]): TShirtSize | null {
  let best = -1;
  for (const s of sizes) {
    const idx = T_SHIRT_SIZES.indexOf(s);
    if (idx > best) best = idx;
  }
  return best === -1 ? null : T_SHIRT_SIZES[best];
}

export interface InitiativeRollup {
  initiativeId: string;
  meanWeighted: number | null;
  opportunityCount: number;
  band: BandLabel | null;
  maxTShirtSize: TShirtSize | null;
  bestClientRank: number | null;
}

/** 8. Initiative rollup across its opportunities. */
export function initiativeRollup(
  initiative: Initiative,
  opportunities: Opportunity[],
  scores: OpportunityScore[],
  model: ScoringModel,
): InitiativeRollup {
  const own = opportunities.filter((o) => o.initiativeId === initiative.id);
  const byOpp = new Map(scores.map((s) => [s.opportunityId, s]));
  const weights = own
    .map((o) => byOpp.get(o.id))
    .filter((s): s is OpportunityScore => s !== undefined)
    .map((s) => weightedScore(s, model));
  const meanWeighted =
    weights.length === 0 ? null : round2(weights.reduce((a, b) => a + b, 0) / weights.length);
  const ranks = own.map((o) => o.clientRank).filter((n): n is number => n !== null);
  return {
    initiativeId: initiative.id,
    meanWeighted,
    opportunityCount: own.length,
    band: meanWeighted === null ? null : priorityBand(meanWeighted, model),
    // The initiative's own size, widened by any larger opportunity inside it.
    maxTShirtSize: maxTShirt([initiative.tShirtSize, ...own.map((o) => o.tShirtSize)]),
    bestClientRank: ranks.length === 0 ? null : Math.min(...ranks),
  };
}

export interface ThemePortfolioRow {
  themeId: string;
  themeName: string;
  opportunityCount: number;
  sharePct: number;
  meanWeighted: number | null;
  countByBand: Record<BandLabel, number>;
}

/** 9. Portfolio shape per theme. Theme membership is derived through the initiative. */
export function themePortfolio(
  themes: Theme[],
  initiatives: Initiative[],
  opportunities: Opportunity[],
  scores: OpportunityScore[],
  model: ScoringModel,
): ThemePortfolioRow[] {
  const themeOfInitiative = new Map(initiatives.map((i) => [i.id, i.themeId]));
  const byOpp = new Map(scores.map((s) => [s.opportunityId, s]));
  const total = opportunities.length;
  return themes.map((theme) => {
    const own = opportunities.filter((o) => themeOfInitiative.get(o.initiativeId) === theme.id);
    const countByBand = Object.fromEntries(BAND_LABELS.map((b) => [b, 0])) as Record<
      BandLabel,
      number
    >;
    const weights: number[] = [];
    for (const opp of own) {
      const score = byOpp.get(opp.id);
      if (!score) continue;
      const w = weightedScore(score, model);
      weights.push(w);
      countByBand[priorityBand(w, model)] += 1;
    }
    return {
      themeId: theme.id,
      themeName: theme.name,
      opportunityCount: own.length,
      sharePct: total === 0 ? 0 : round2((own.length / total) * 100),
      meanWeighted:
        weights.length === 0 ? null : round2(weights.reduce((a, b) => a + b, 0) / weights.length),
      countByBand,
    };
  });
}

/** Dependency types that constrain sequencing when marked `hard`. */
const BLOCKING_TYPES = new Set<Dependency['type']>(['finish_to_start', 'enables']);

function isBlocking(dep: Dependency): boolean {
  return dep.strength === 'hard' && BLOCKING_TYPES.has(dep.type);
}

/**
 * 10. The earliest wave sequence an initiative may occupy given hard finish_to_start and
 * enables prerequisites. A prerequisite in wave n pushes the dependent to wave n+1 at the
 * earliest. Prerequisites that are themselves unassigned are resolved recursively from the
 * first wave. Cycles are broken defensively so this can never recurse forever.
 */
export function earliestStart(
  initiativeId: string,
  dependencies: Dependency[],
  waves: Wave[],
  initiatives: Initiative[],
): number {
  const sequences = waves.map((w) => w.sequence);
  const firstSeq = sequences.length === 0 ? 1 : Math.min(...sequences);
  const waveSeq = new Map(waves.map((w) => [w.id, w.sequence]));
  const initById = new Map(initiatives.map((i) => [i.id, i]));

  const visit = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return firstSeq;
    seen.add(id);
    // `from` enables / must finish before `to`.
    const prereqs = dependencies.filter((d) => d.toInitiativeId === id && isBlocking(d));
    let earliest = firstSeq;
    for (const dep of prereqs) {
      const prereq = initById.get(dep.fromInitiativeId);
      if (!prereq) continue;
      const prereqSeq =
        prereq.waveId !== null && waveSeq.has(prereq.waveId)
          ? (waveSeq.get(prereq.waveId) as number)
          : visit(prereq.id, seen);
      earliest = Math.max(earliest, prereqSeq + 1);
    }
    seen.delete(id);
    return earliest;
  };

  return visit(initiativeId, new Set());
}

/**
 * 11. Cycle detection over the dependency graph (all types, both strengths — a soft cycle is
 * still a modelling error worth surfacing). Returns each cycle as an array of initiative ids
 * in traversal order, starting and ending at the same id.
 */
export function detectCycles(dependencies: Dependency[]): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = adjacency.get(dep.fromInitiativeId) ?? [];
    list.push(dep.toInitiativeId);
    adjacency.set(dep.fromInitiativeId, list);
  }
  const cycles: string[][] = [];
  const seenSignatures = new Set<string>();
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const signature = (cycle: string[]): string => {
    const core = cycle.slice(0, -1);
    const rotations = core.map((_, i) => [...core.slice(i), ...core.slice(0, i)].join('>'));
    return rotations.sort()[0];
  };

  const walk = (node: string): void => {
    state.set(node, 'visiting');
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (state.get(next) === 'visiting') {
        const start = stack.indexOf(next);
        const cycle = [...stack.slice(start), next];
        const sig = signature(cycle);
        if (!seenSignatures.has(sig)) {
          seenSignatures.add(sig);
          cycles.push(cycle);
        }
      } else if (state.get(next) !== 'done') {
        walk(next);
      }
    }
    stack.pop();
    state.set(node, 'done');
  };

  const nodes = new Set<string>();
  for (const dep of dependencies) {
    nodes.add(dep.fromInitiativeId);
    nodes.add(dep.toInitiativeId);
  }
  for (const node of nodes) {
    if (!state.has(node)) walk(node);
  }
  return cycles;
}

export type FeasibilityIssueType =
  | 'dependency_violation'
  | 'unassigned_wave'
  | 'missing_owner_on_critical_path'
  | 'wave_overloaded'
  | 'cycle';

export interface FeasibilityIssue {
  type: FeasibilityIssueType;
  severity: Severity_;
  initiativeId: string | null;
  initiativeName: string | null;
  dependencyId: string | null;
  waveId: string | null;
  message: string;
  /** The single smallest change that clears the issue. */
  resolution: string;
}

type Severity_ = 'low' | 'medium' | 'high';

const LARGE_SIZES = new Set<TShirtSize>(['L', 'XL', 'XXL']);

/**
 * 12. Feasibility issues across the current roadmap. Every issue names the specific
 * initiative, the specific dependency where relevant, and the minimum resolving change.
 */
export function feasibilityIssues(
  initiatives: Initiative[],
  dependencies: Dependency[],
  waves: Wave[],
): FeasibilityIssue[] {
  const issues: FeasibilityIssue[] = [];
  const byId = new Map(initiatives.map((i) => [i.id, i]));
  const waveById = new Map(waves.map((w) => [w.id, w]));
  const waveBySeq = new Map(waves.map((w) => [w.sequence, w]));
  const nameOf = (id: string): string => byId.get(id)?.name ?? id;

  // dependency_violation — a dependent sits at or before its hard prerequisite.
  for (const dep of dependencies) {
    if (!isBlocking(dep)) continue;
    const from = byId.get(dep.fromInitiativeId);
    const to = byId.get(dep.toInitiativeId);
    if (!from || !to) continue;
    const fromWave = from.waveId ? waveById.get(from.waveId) : undefined;
    const toWave = to.waveId ? waveById.get(to.waveId) : undefined;
    if (!fromWave || !toWave) continue;
    if (toWave.sequence <= fromWave.sequence) {
      const needed = waveBySeq.get(fromWave.sequence + 1);
      issues.push({
        type: 'dependency_violation',
        severity: 'high',
        initiativeId: to.id,
        initiativeName: to.name,
        dependencyId: dep.id,
        waveId: to.waveId,
        message: `"${to.name}" is scheduled in ${toWave.label} but depends on "${from.name}" (${dep.type.replace(/_/g, ' ')}, hard) which is in ${fromWave.label}.`,
        resolution: needed
          ? `Move "${to.name}" to ${needed.label} or later, or pull "${from.name}" back to an earlier wave.`
          : `Move "${to.name}" after ${fromWave.label}, or pull "${from.name}" earlier. No later wave exists yet — add one.`,
      });
    }
  }

  // unassigned_wave — an initiative with no place on the roadmap.
  for (const init of initiatives) {
    if (init.waveId === null) {
      const min = earliestStart(init.id, dependencies, waves, initiatives);
      const target = waveBySeq.get(min);
      issues.push({
        type: 'unassigned_wave',
        severity: 'medium',
        initiativeId: init.id,
        initiativeName: init.name,
        dependencyId: null,
        waveId: null,
        message: `"${init.name}" is not assigned to a wave, so it does not appear on the roadmap.`,
        resolution: target
          ? `Assign "${init.name}" to ${target.label} or later — that is the earliest wave its dependencies allow.`
          : `Assign "${init.name}" to a wave.`,
      });
    }
  }

  // missing_owner_on_critical_path — an initiative that blocks another has no owner.
  const blocksSomething = new Set(dependencies.filter(isBlocking).map((d) => d.fromInitiativeId));
  for (const init of initiatives) {
    if (blocksSomething.has(init.id) && init.owner.trim() === '') {
      const blocked = dependencies
        .filter((d) => isBlocking(d) && d.fromInitiativeId === init.id)
        .map((d) => nameOf(d.toInitiativeId));
      issues.push({
        type: 'missing_owner_on_critical_path',
        severity: 'high',
        initiativeId: init.id,
        initiativeName: init.name,
        dependencyId: null,
        waveId: init.waveId,
        message: `"${init.name}" has no named owner but blocks ${blocked.length} initiative(s): ${blocked.join(', ')}.`,
        resolution: `Name an accountable owner for "${init.name}".`,
      });
    }
  }

  // wave_overloaded — more than three L+ initiatives in one wave.
  for (const wave of waves) {
    const heavy = initiatives.filter((i) => i.waveId === wave.id && LARGE_SIZES.has(i.tShirtSize));
    if (heavy.length > 3) {
      const movable = heavy[heavy.length - 1];
      issues.push({
        type: 'wave_overloaded',
        severity: 'medium',
        initiativeId: movable.id,
        initiativeName: movable.name,
        dependencyId: null,
        waveId: wave.id,
        message: `${wave.label} carries ${heavy.length} initiatives sized L or above (${heavy.map((i) => i.name).join(', ')}); the capacity guardrail is 3.`,
        resolution: `Move ${heavy.length - 3} of them out of ${wave.label} — starting with "${movable.name}" — or split the largest into phases.`,
      });
    }
  }

  // cycle — the graph cannot be sequenced at all.
  for (const cycle of detectCycles(dependencies)) {
    const names = cycle.map(nameOf).join(' -> ');
    const lastFrom = cycle[cycle.length - 2];
    const lastTo = cycle[cycle.length - 1];
    const closing = dependencies.find(
      (d) => d.fromInitiativeId === lastFrom && d.toInitiativeId === lastTo,
    );
    issues.push({
      type: 'cycle',
      severity: 'high',
      initiativeId: cycle[0] ?? null,
      initiativeName: cycle[0] ? nameOf(cycle[0]) : null,
      dependencyId: closing?.id ?? null,
      waveId: null,
      message: `Circular dependency: ${names}. No wave assignment can satisfy it.`,
      resolution: closing
        ? `Remove or soften the dependency "${nameOf(closing.fromInitiativeId)} -> ${nameOf(closing.toInitiativeId)}" to break the loop.`
        : `Remove one dependency in the loop to break it.`,
    });
  }

  return issues;
}

export interface QuadrantPopulation {
  counts: Record<QuadrantLabel, number>;
  emptyQuadrants: QuadrantLabel[];
  notes: string[];
  total: number;
}

/**
 * 13. Quadrant population, including an explicit note when a quadrant is unreachable in
 * practice. We surface this rather than hiding it: the business-value axis averages strategic
 * alignment with financial impact, and strategic alignment co-varies with risk if deferred, so
 * a high-urgency item almost always carries enough alignment to clear the value threshold.
 * "Defend" is therefore rarely reachable — the framework, not the data, is the cause.
 */
export function quadrantPopulation(
  opportunities: Opportunity[],
  scores: OpportunityScore[],
  model: ScoringModel,
): QuadrantPopulation {
  const counts = Object.fromEntries(QUADRANT_LABELS.map((q) => [q, 0])) as Record<
    QuadrantLabel,
    number
  >;
  const oppIds = new Set(opportunities.map((o) => o.id));
  let total = 0;
  for (const score of scores) {
    if (!oppIds.has(score.opportunityId)) continue;
    counts[quadrant(score, model)] += 1;
    total += 1;
  }
  const emptyQuadrants = QUADRANT_LABELS.filter((q) => counts[q] === 0);
  const notes: string[] = [];
  for (const q of emptyQuadrants) {
    if (q === 'Defend') {
      notes.push(
        'No opportunity lands in "Defend". This is a property of the framework, not a gap in the ' +
          'analysis: business value averages strategic alignment with financial impact, and ' +
          'strategic alignment co-varies with risk if deferred, so a high-urgency item almost ' +
          `always clears the ${model.quadrantThreshold} value threshold. Treat "Defend" as a ` +
          'label to review with the client rather than a bucket to fill.',
      );
    } else {
      notes.push(
        `No opportunity lands in "${q}". Check whether the register is genuinely missing work of ` +
          'that shape before presenting the 2x2.',
      );
    }
  }
  return { counts, emptyQuadrants, notes, total };
}
