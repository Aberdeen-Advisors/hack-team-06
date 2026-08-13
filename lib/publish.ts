/**
 * Snapshot construction. The client portal reads only from a PublishedSnapshot, so this file
 * decides exactly what a client can see: the selected entities, deep-copied and frozen, plus
 * the derived values computed at publish time. A later edit to working data cannot leak into
 * an already published snapshot.
 */

import {
  capabilityAreaMaturity,
  deriveOpportunity,
  initiativeRollup,
  themePortfolio,
} from './calc';
import type {
  Database,
  PublishSelection,
  PublishedPayload,
  PublishedSnapshot,
} from './types';

export const DEFAULT_SELECTION: PublishSelection = {
  includeCurrentState: true,
  includeMaturityHeatmap: true,
  includeOpportunities: true,
  includeInitiatives: true,
  includeRoadmap: true,
  includeDecisions: true,
  includeScores: true,
  allowComments: true,
  allowRanking: true,
  allowDependencySuggestions: true,
  allowTimingFeedback: true,
};

export function normalizeSelection(input: unknown): PublishSelection {
  const raw = (input ?? {}) as Partial<Record<keyof PublishSelection, unknown>>;
  const out = {} as PublishSelection;
  for (const key of Object.keys(DEFAULT_SELECTION) as (keyof PublishSelection)[]) {
    out[key] = typeof raw[key] === 'boolean' ? (raw[key] as boolean) : DEFAULT_SELECTION[key];
  }
  return out;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Recursively freeze so a snapshot cannot be mutated after publication. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export function buildPublishedPayload(
  db: Database,
  engagementId: string,
  selection: PublishSelection,
): PublishedPayload {
  const engagement = db.engagements.find((e) => e.id === engagementId);
  if (!engagement) throw new Error(`Unknown engagement ${engagementId}`);
  const model = db.scoringModels.find((m) => m.id === engagement.scoringModelId) ?? null;

  const scope = <T extends { engagementId: string }>(rows: T[]): T[] =>
    rows.filter((r) => r.engagementId === engagementId);

  const capabilityAreas = scope(db.capabilityAreas);
  const maturityFocusAreas = selection.includeMaturityHeatmap ? scope(db.maturityFocusAreas) : [];
  const findings = selection.includeCurrentState ? scope(db.findings) : [];
  // Evidence backs the findings and maturity ratings; without either, it is not shown.
  const evidence =
    selection.includeCurrentState || selection.includeMaturityHeatmap ? scope(db.evidence) : [];
  const themes = scope(db.themes);
  const initiatives = selection.includeInitiatives ? scope(db.initiatives) : [];
  const opportunities = selection.includeOpportunities ? scope(db.opportunities) : [];
  const oppIds = new Set(opportunities.map((o) => o.id));
  const opportunityScores = selection.includeScores
    ? db.opportunityScores.filter((s) => oppIds.has(s.opportunityId))
    : [];
  const waves = selection.includeRoadmap ? scope(db.waves) : [];
  const dependencies = selection.includeRoadmap ? scope(db.dependencies) : [];
  const decisions = selection.includeDecisions ? scope(db.decisions) : [];

  const allInitiatives = scope(db.initiatives);
  const allScores = db.opportunityScores.filter((s) =>
    scope(db.opportunities).some((o) => o.id === s.opportunityId),
  );

  const derivedOpportunities = opportunities.map((opp) => {
    const score = opportunityScores.find((s) => s.opportunityId === opp.id);
    if (!score || !model) {
      return {
        opportunityId: opp.id,
        weighted: null,
        band: null,
        businessValue: null,
        urgency: null,
        quadrant: null,
      };
    }
    const d = deriveOpportunity(score, model);
    return {
      opportunityId: opp.id,
      weighted: d.weighted,
      band: d.band,
      businessValue: d.businessValue,
      urgency: d.urgency,
      quadrant: d.quadrant,
    };
  });

  const derivedInitiatives =
    model === null
      ? []
      : initiatives.map((init) => {
          const rollup = initiativeRollup(init, scope(db.opportunities), allScores, model);
          return {
            initiativeId: init.id,
            meanWeighted: rollup.meanWeighted,
            opportunityCount: rollup.opportunityCount,
            band: rollup.band,
            maxTShirtSize: rollup.maxTShirtSize,
            bestClientRank: rollup.bestClientRank,
          };
        });

  const derivedThemes =
    model === null || !selection.includeOpportunities
      ? []
      : themePortfolio(themes, allInitiatives, opportunities, opportunityScores, model).map((t) => ({
          themeId: t.themeId,
          opportunityCount: t.opportunityCount,
          sharePct: t.sharePct,
          meanWeighted: t.meanWeighted,
          countByBand: t.countByBand,
        }));

  const maturityByCapabilityArea = capabilityAreas.map((area) => {
    const rollup = capabilityAreaMaturity(
      maturityFocusAreas.filter((f) => f.capabilityAreaId === area.id),
    );
    return {
      capabilityAreaId: area.id,
      meanCurrent: rollup.meanCurrent,
      meanTarget: rollup.meanTarget,
      meanGap: rollup.meanGap,
      countAssessed: rollup.countAssessed,
      countInsufficientEvidence: rollup.countInsufficientEvidence,
    };
  });

  return deepClone({
    engagement,
    scoringModel: selection.includeScores ? model : null,
    capabilityAreas,
    maturityFocusAreas,
    findings,
    evidence,
    themes,
    initiatives,
    opportunities,
    opportunityScores,
    dependencies,
    waves,
    decisions,
    derived: {
      opportunities: derivedOpportunities,
      initiatives: derivedInitiatives,
      themes: derivedThemes,
      maturityByCapabilityArea,
    },
  });
}

export function buildSnapshot(args: {
  db: Database;
  engagementId: string;
  selection: PublishSelection;
  version: number;
  publishedBy: string;
  note: string;
  publishedAt?: string;
  id?: string;
}): PublishedSnapshot {
  const { db, engagementId, selection, version, publishedBy, note } = args;
  const snapshot: PublishedSnapshot = {
    id: args.id ?? `snap_${engagementId}_v${version}`,
    engagementId,
    version,
    publishedAt: args.publishedAt ?? new Date().toISOString(),
    publishedBy,
    note,
    selection: { ...selection },
    payload: buildPublishedPayload(db, engagementId, selection),
  };
  return deepFreeze(snapshot);
}

export function latestSnapshot(
  db: Database,
  engagementId: string,
): PublishedSnapshot | null {
  const rows = db.publishedSnapshots
    .filter((s) => s.engagementId === engagementId)
    .sort((a, b) => b.version - a.version);
  return rows[0] ?? null;
}
