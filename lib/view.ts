/**
 * Conductor — assembled read models.
 *
 * One place that joins the working model to its derived values, so a page and an API route can
 * never disagree about a number. Server components import from here directly; route handlers
 * serialise the same objects.
 */

import {
  capabilityAreaMaturity,
  deriveOpportunity,
  detectCycles,
  earliestStart,
  feasibilityIssues,
  initiativeRollup,
  maturityGap,
  quadrantPopulation,
  themePortfolio,
} from './calc';
import type {
  CapabilityAreaMaturity,
  FeasibilityIssue,
  InitiativeRollup,
  OpportunityDerived,
  QuadrantPopulation,
  ThemePortfolioRow,
} from './calc';
import { latestSnapshot } from './publish';
import { getDb } from './store';
import type {
  AISuggestion,
  CapabilityArea,
  ClientSubmission,
  Database,
  Decision,
  Dependency,
  Engagement,
  Evidence,
  Finding,
  Initiative,
  MaturityFocusArea,
  Opportunity,
  OpportunityScore,
  PublishedSnapshot,
  ScoringModel,
  Theme,
  Wave,
} from './types';

export interface OpportunityRow {
  opportunity: Opportunity;
  score: OpportunityScore | null;
  derived: OpportunityDerived | null;
  initiative: Initiative | null;
  theme: Theme | null;
  capabilityArea: CapabilityArea | null;
}

export interface InitiativeRow {
  initiative: Initiative;
  theme: Theme | null;
  wave: Wave | null;
  rollup: InitiativeRollup;
  opportunityCount: number;
  earliestWaveSequence: number;
}

export interface MaturityRow {
  focusArea: MaturityFocusArea;
  capabilityArea: CapabilityArea | null;
  gap: number | null;
}

export interface CapabilityAreaRow {
  capabilityArea: CapabilityArea;
  maturity: CapabilityAreaMaturity;
  findingCount: number;
  opportunityCount: number;
}

export interface EngagementView {
  engagement: Engagement;
  scoringModel: ScoringModel;
  capabilityAreas: CapabilityArea[];
  capabilityAreaRows: CapabilityAreaRow[];
  maturityRows: MaturityRow[];
  evidence: Evidence[];
  findings: Finding[];
  themes: Theme[];
  themePortfolio: ThemePortfolioRow[];
  initiatives: Initiative[];
  initiativeRows: InitiativeRow[];
  opportunities: Opportunity[];
  opportunityRows: OpportunityRow[];
  opportunityScores: OpportunityScore[];
  dependencies: Dependency[];
  waves: Wave[];
  decisions: Decision[];
  aiSuggestions: AISuggestion[];
  submissions: ClientSubmission[];
  latestSnapshot: PublishedSnapshot | null;
  /** Newest first. */
  allSnapshots: PublishedSnapshot[];
  snapshotVersions: number[];
  feasibility: FeasibilityIssue[];
  quadrants: QuadrantPopulation;
  cycles: string[][];
}

function scoped<T extends { engagementId: string }>(rows: T[], engagementId: string): T[] {
  return rows.filter((r) => r.engagementId === engagementId);
}

export function findEngagement(engagementId: string): Engagement | null {
  return getDb().engagements.find((e) => e.id === engagementId) ?? null;
}

export function buildEngagementView(engagementId: string, db: Database = getDb()): EngagementView {
  const engagement = db.engagements.find((e) => e.id === engagementId);
  if (!engagement) throw new Error(`Unknown engagement ${engagementId}`);
  const scoringModel = db.scoringModels.find((m) => m.id === engagement.scoringModelId);
  if (!scoringModel) throw new Error(`Engagement ${engagementId} has no scoring model`);

  const capabilityAreas = scoped(db.capabilityAreas, engagementId).sort(
    (a, b) => a.sequence - b.sequence,
  );
  const maturityFocusAreas = scoped(db.maturityFocusAreas, engagementId);
  const evidence = scoped(db.evidence, engagementId);
  const findings = scoped(db.findings, engagementId);
  const themes = scoped(db.themes, engagementId).sort((a, b) => a.sequence - b.sequence);
  const initiatives = scoped(db.initiatives, engagementId);
  const opportunities = scoped(db.opportunities, engagementId);
  const oppIds = new Set(opportunities.map((o) => o.id));
  const opportunityScores = db.opportunityScores.filter((s) => oppIds.has(s.opportunityId));
  const dependencies = scoped(db.dependencies, engagementId);
  const waves = scoped(db.waves, engagementId).sort((a, b) => a.sequence - b.sequence);
  const decisions = scoped(db.decisions, engagementId);
  const aiSuggestions = scoped(db.aiSuggestions, engagementId);
  const submissions = scoped(db.clientSubmissions, engagementId);

  const scoreByOpp = new Map(opportunityScores.map((s) => [s.opportunityId, s]));
  const initById = new Map(initiatives.map((i) => [i.id, i]));
  const themeById = new Map(themes.map((t) => [t.id, t]));
  const capById = new Map(capabilityAreas.map((c) => [c.id, c]));
  const waveById = new Map(waves.map((w) => [w.id, w]));

  const opportunityRows: OpportunityRow[] = opportunities.map((opportunity) => {
    const score = scoreByOpp.get(opportunity.id) ?? null;
    const initiative = initById.get(opportunity.initiativeId) ?? null;
    return {
      opportunity,
      score,
      derived: score ? deriveOpportunity(score, scoringModel) : null,
      initiative,
      theme: initiative ? themeById.get(initiative.themeId) ?? null : null,
      capabilityArea: capById.get(opportunity.capabilityAreaId) ?? null,
    };
  });

  const initiativeRows: InitiativeRow[] = initiatives.map((initiative) => ({
    initiative,
    theme: themeById.get(initiative.themeId) ?? null,
    wave: initiative.waveId ? waveById.get(initiative.waveId) ?? null : null,
    rollup: initiativeRollup(initiative, opportunities, opportunityScores, scoringModel),
    opportunityCount: opportunities.filter((o) => o.initiativeId === initiative.id).length,
    earliestWaveSequence: earliestStart(initiative.id, dependencies, waves, initiatives),
  }));

  const capabilityAreaRows: CapabilityAreaRow[] = capabilityAreas.map((capabilityArea) => ({
    capabilityArea,
    maturity: capabilityAreaMaturity(
      maturityFocusAreas.filter((f) => f.capabilityAreaId === capabilityArea.id),
    ),
    findingCount: findings.filter((f) => f.capabilityAreaId === capabilityArea.id).length,
    opportunityCount: opportunities.filter((o) => o.capabilityAreaId === capabilityArea.id).length,
  }));

  const maturityRows: MaturityRow[] = maturityFocusAreas.map((focusArea) => ({
    focusArea,
    capabilityArea: capById.get(focusArea.capabilityAreaId) ?? null,
    gap: maturityGap(focusArea),
  }));

  return {
    engagement,
    scoringModel,
    capabilityAreas,
    capabilityAreaRows,
    maturityRows,
    evidence,
    findings,
    themes,
    themePortfolio: themePortfolio(
      themes,
      initiatives,
      opportunities,
      opportunityScores,
      scoringModel,
    ),
    initiatives,
    initiativeRows,
    opportunities,
    opportunityRows,
    opportunityScores,
    dependencies,
    waves,
    decisions,
    aiSuggestions,
    submissions,
    latestSnapshot: latestSnapshot(db, engagementId),
    allSnapshots: db.publishedSnapshots
      .filter((s) => s.engagementId === engagementId)
      .slice()
      .sort((a, b) => b.version - a.version),
    snapshotVersions: db.publishedSnapshots
      .filter((s) => s.engagementId === engagementId)
      .map((s) => s.version)
      .sort((a, b) => a - b),
    feasibility: feasibilityIssues(initiatives, dependencies, waves),
    quadrants: quadrantPopulation(opportunities, opportunityScores, scoringModel),
    cycles: detectCycles(dependencies),
  };
}

/** The engagement a signed-in user works on. The demo has exactly one. */
export function primaryEngagementId(engagementIds: string[]): string | null {
  return engagementIds[0] ?? null;
}

export function getPublishedSnapshot(engagementId: string): PublishedSnapshot | null {
  return latestSnapshot(getDb(), engagementId);
}

/** Evidence lookup used wherever a rationale cites its sources. */
export function evidenceByIds(ids: string[], pool: Evidence[]): Evidence[] {
  const byId = new Map(pool.map((e) => [e.id, e]));
  return ids.map((id) => byId.get(id)).filter((e): e is Evidence => e !== undefined);
}
