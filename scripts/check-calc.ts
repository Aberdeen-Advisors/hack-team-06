/**
 * Calculation checks. Run with `npx tsx scripts/check-calc.ts`.
 *
 * Prints PASS/FAIL per case and exits non-zero if anything fails. Covers every band boundary
 * (4.5 / 3.75 / 2.8), the quadrant threshold (3.5), an invalid weight set, an unassessed focus
 * area, a dependency cycle, and the integrity of the seeded demo data.
 */

import {
  businessValueAxis,
  capabilityAreaMaturity,
  detectCycles,
  earliestStart,
  feasibilityIssues,
  initiativeRollup,
  maturityGap,
  priorityBand,
  quadrant,
  quadrantPopulation,
  themePortfolio,
  urgencyAxis,
  weightedScore,
} from '../lib/calc';
import { buildSeed } from '../lib/seed';
import { buildEngagementView } from '../lib/view';
import type {
  AnchorScore,
  Dependency,
  Initiative,
  MaturityFocusArea,
  OpportunityScore,
  ScoringModel,
  Wave,
} from '../lib/types';

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL  ${name}`);
    console.log(`      ${message}`);
  }
}

function eq<T>(actual: T, expected: T, label = ''): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + ': ' : ''}expected ${e}, got ${a}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const seed = buildSeed();
const model = seed.scoringModels[0];

function score(fi: AnchorScore, rd: AnchorScore, sa: AnchorScore): OpportunityScore {
  return {
    id: 'oscore_test',
    opportunityId: 'opp_test',
    scoringModelId: model.id,
    financialImpact: fi,
    riskIfDeferred: rd,
    strategicAlignment: sa,
    rationale: { financial_impact: '', risk_if_deferred: '', strategic_alignment: '' },
    evidenceIds: { financial_impact: [], risk_if_deferred: [], strategic_alignment: [] },
    scoredBy: 'test',
    scoredAt: '2026-01-01T00:00:00.000Z',
  };
}

/* 1 */
check('weightedScore: 5/5/5 = 5.00', () => {
  eq(weightedScore(score(5, 5, 5), model), 5);
});

/* 2 */
check('weightedScore: 4/3/3 = 3.40 (0.40x4 + 0.35x3 + 0.25x3)', () => {
  eq(weightedScore(score(4, 3, 3), model), 3.4);
});

/* 3 */
check('weightedScore: 2/4/2 = 2.70 and rounds to 2 decimals', () => {
  eq(weightedScore(score(2, 4, 2), model), 2.7);
});

/* 4 */
check('band boundary: 4.5 is inclusive and yields Critical', () => {
  eq(priorityBand(4.5, model), 'Critical');
  eq(priorityBand(4.49, model), 'High Priority');
  // 5/5/3 lands exactly on the boundary from real dimension scores.
  eq(weightedScore(score(5, 5, 3), model), 4.5);
  eq(priorityBand(weightedScore(score(5, 5, 3), model), model), 'Critical');
});

/* 5 */
check('band boundary: 3.75 is inclusive and yields High Priority', () => {
  eq(priorityBand(3.75, model), 'High Priority');
  eq(priorityBand(3.74, model), 'Medium Priority');
  eq(weightedScore(score(4, 4, 3), model), 3.75);
  eq(priorityBand(weightedScore(score(4, 4, 3), model), model), 'High Priority');
});

/* 6 */
check('band boundary: 2.8 is inclusive and yields Medium Priority', () => {
  eq(priorityBand(2.8, model), 'Medium Priority');
  eq(priorityBand(2.79, model), 'Lower Priority');
  eq(weightedScore(score(4, 2, 2), model), 2.8);
  eq(priorityBand(weightedScore(score(4, 2, 2), model), model), 'Medium Priority');
});

/* 7 */
check('weights that do not sum to 1.0 throw', () => {
  const broken: ScoringModel = {
    ...model,
    id: 'model_broken',
    dimensions: model.dimensions.map((d) =>
      d.key === 'financial_impact' ? { ...d, weight: 0.5 } : d,
    ),
  };
  let threw = false;
  try {
    weightedScore(score(3, 3, 3), broken);
  } catch (error) {
    threw = true;
    assert(
      error instanceof Error && /weights sum to/.test(error.message),
      `unexpected error message: ${String(error)}`,
    );
  }
  assert(threw, 'expected weightedScore to throw on an invalid weight set');
});

/* 8 */
check('axes: business value averages alignment and financial impact; urgency is risk', () => {
  eq(businessValueAxis(score(4, 5, 3)), 3.5);
  eq(urgencyAxis(score(4, 5, 3)), 5);
  eq(businessValueAxis(score(5, 2, 4)), 4.5);
});

/* 9 */
check('quadrant threshold 3.5 is inclusive on both axes', () => {
  // value 3.5, urgency 4 -> Act Now (threshold is inclusive)
  eq(quadrant(score(4, 4, 3), model), 'Act Now');
  // value 3.0, urgency 4 -> Defend
  eq(quadrant(score(3, 4, 3), model), 'Defend');
  // value 4.0, urgency 3 -> Plan & Fund
  eq(quadrant(score(4, 3, 4), model), 'Plan & Fund');
  // value 2.5, urgency 3 -> Sequence Later
  eq(quadrant(score(2, 3, 3), model), 'Sequence Later');
});

/* 10 */
check('maturityGap is null when either level is unassessed', () => {
  const base: MaturityFocusArea = {
    id: 'mfa_test',
    engagementId: 'eng_test',
    capabilityAreaId: 'cap_test',
    name: 'test',
    currentLevel: 2,
    targetLevel: 4,
    rationale: '',
    evidenceIds: [],
    insufficientEvidence: false,
  };
  eq(maturityGap(base), 2);
  eq(maturityGap({ ...base, currentLevel: null }), null);
  eq(maturityGap({ ...base, targetLevel: null }), null);
});

/* 11 */
check('capabilityAreaMaturity excludes unassessed areas from means, never zeroes them', () => {
  const mk = (
    id: string,
    current: MaturityFocusArea['currentLevel'],
    target: MaturityFocusArea['targetLevel'],
    insufficient = false,
  ): MaturityFocusArea => ({
    id,
    engagementId: 'eng_test',
    capabilityAreaId: 'cap_test',
    name: id,
    currentLevel: current,
    targetLevel: target,
    rationale: '',
    evidenceIds: [],
    insufficientEvidence: insufficient,
  });
  const rollup = capabilityAreaMaturity([
    mk('a', 2, 4),
    mk('b', 4, 4),
    mk('c', null, 3, true), // unassessed: must not drag the mean toward zero
  ]);
  eq(rollup.meanCurrent, 3, 'meanCurrent');
  eq(rollup.meanTarget, 3.67, 'meanTarget');
  eq(rollup.meanGap, 1, 'meanGap');
  eq(rollup.countAssessed, 2, 'countAssessed');
  eq(rollup.countInsufficientEvidence, 1, 'countInsufficientEvidence');
  eq(rollup.countTotal, 3, 'countTotal');
});

/* 12 */
check('initiativeRollup means its opportunity scores and takes the largest t-shirt size', () => {
  const view = buildEngagementView('eng_northwind', seed);
  const cyber = seed.initiatives.find((i) => i.id === 'init_cyber_uplift') as Initiative;
  const rollup = initiativeRollup(cyber, seed.opportunities, seed.opportunityScores, model);
  // OPP-011 4.50, OPP-012 4.10, OPP-013 3.85, OPP-014 3.00 -> mean 3.8625 -> 3.86
  eq(rollup.opportunityCount, 4, 'opportunityCount');
  eq(rollup.meanWeighted, 3.86, 'meanWeighted');
  eq(rollup.band, 'High Priority', 'band');
  eq(rollup.maxTShirtSize, 'M', 'maxTShirtSize');
  eq(rollup.bestClientRank, 4, 'bestClientRank');
  assert(view.initiativeRows.length === 12, 'expected 12 initiatives in the view');
});

/* 13 */
check('themePortfolio shares sum to 100 percent and bands are counted', () => {
  const rows = themePortfolio(
    seed.themes,
    seed.initiatives,
    seed.opportunities,
    seed.opportunityScores,
    model,
  );
  const totalCount = rows.reduce((a, r) => a + r.opportunityCount, 0);
  eq(totalCount, seed.opportunities.length, 'every opportunity belongs to exactly one theme');
  const share = rows.reduce((a, r) => a + r.sharePct, 0);
  assert(Math.abs(share - 100) < 0.05, `shares sum to ${share}, expected 100`);
  const banded = rows.reduce(
    (a, r) => a + Object.values(r.countByBand).reduce((x, y) => x + y, 0),
    0,
  );
  eq(banded, seed.opportunities.length, 'every scored opportunity is banded exactly once');
});

/* 14 */
check('earliestStart pushes a dependent one wave past its hard prerequisite', () => {
  // init_warehouse_automation depends on init_wms_optimisation (Wave 2, hard finish_to_start).
  eq(
    earliestStart('init_warehouse_automation', seed.dependencies, seed.waves, seed.initiatives),
    3,
  );
  // A chain with an unassigned prerequisite resolves recursively from the first wave.
  const waves: Wave[] = seed.waves;
  const initiatives: Initiative[] = [
    { ...seed.initiatives[0], id: 'init_a', waveId: null },
    { ...seed.initiatives[0], id: 'init_b', waveId: null },
    { ...seed.initiatives[0], id: 'init_c', waveId: null },
  ];
  const deps: Dependency[] = [
    { ...seed.dependencies[0], id: 'd1', fromInitiativeId: 'init_a', toInitiativeId: 'init_b' },
    { ...seed.dependencies[0], id: 'd2', fromInitiativeId: 'init_b', toInitiativeId: 'init_c' },
  ];
  eq(earliestStart('init_c', deps, waves, initiatives), 3, 'a -> b -> c starts in wave 3');
});

/* 15 */
check('detectCycles finds a cycle and reports none on the seeded graph', () => {
  eq(detectCycles(seed.dependencies), [], 'the seeded dependency graph is acyclic');
  const base = seed.dependencies[0];
  const cyclic: Dependency[] = [
    { ...base, id: 'c1', fromInitiativeId: 'init_x', toInitiativeId: 'init_y' },
    { ...base, id: 'c2', fromInitiativeId: 'init_y', toInitiativeId: 'init_z' },
    { ...base, id: 'c3', fromInitiativeId: 'init_z', toInitiativeId: 'init_x' },
  ];
  const cycles = detectCycles(cyclic);
  eq(cycles.length, 1, 'one cycle found');
  eq(cycles[0][0], cycles[0][cycles[0].length - 1], 'the cycle closes on itself');
  eq(cycles[0].length, 4, 'x -> y -> z -> x');
});

/* 16 */
check('feasibilityIssues reports the seeded violation, the unassigned wave and the missing owner', () => {
  const issues = feasibilityIssues(seed.initiatives, seed.dependencies, seed.waves);
  const violation = issues.find((i) => i.type === 'dependency_violation');
  assert(violation !== undefined, 'expected a dependency_violation in the seeded plan');
  eq(violation?.initiativeId, 'init_b2b_portal', 'violating initiative');
  eq(violation?.dependencyId, 'dep_002', 'violating dependency');
  assert(
    (violation?.resolution ?? '').includes('Wave 3'),
    `resolution should name the minimum fix, got: ${violation?.resolution}`,
  );
  const unassigned = issues.filter((i) => i.type === 'unassigned_wave');
  eq(unassigned.length, 1, 'exactly one unassigned initiative');
  eq(unassigned[0].initiativeId, 'init_warehouse_automation', 'unassigned initiative');
  const owner = issues.filter((i) => i.type === 'missing_owner_on_critical_path');
  eq(owner.length, 1, 'exactly one missing owner on the critical path');
  eq(owner[0].initiativeId, 'init_master_data', 'initiative missing an owner');
  eq(issues.filter((i) => i.type === 'cycle').length, 0, 'no cycles in the seed');
});

/* 17 */
check('feasibilityIssues flags an overloaded wave above three large initiatives', () => {
  const wave = seed.waves[0];
  const heavy: Initiative[] = ['a', 'b', 'c', 'd'].map((k) => ({
    ...seed.initiatives[0],
    id: `init_heavy_${k}`,
    name: `Heavy ${k}`,
    waveId: wave.id,
    tShirtSize: 'XL',
    owner: 'Someone',
  }));
  const issues = feasibilityIssues(heavy, [], seed.waves);
  const overload = issues.filter((i) => i.type === 'wave_overloaded');
  eq(overload.length, 1, 'one overloaded wave');
  eq(overload[0].waveId, wave.id, 'overloaded wave id');
  const three = feasibilityIssues(heavy.slice(0, 3), [], seed.waves);
  eq(three.filter((i) => i.type === 'wave_overloaded').length, 0, 'three large is within guardrail');
});

/* 18 */
check('feasibilityIssues reports a cycle as unsequenceable', () => {
  const initiatives: Initiative[] = ['p', 'q'].map((k) => ({
    ...seed.initiatives[0],
    id: `init_${k}`,
    name: k.toUpperCase(),
    waveId: seed.waves[0].id,
    owner: 'Someone',
    tShirtSize: 'S',
  }));
  const deps: Dependency[] = [
    { ...seed.dependencies[0], id: 'z1', fromInitiativeId: 'init_p', toInitiativeId: 'init_q' },
    { ...seed.dependencies[0], id: 'z2', fromInitiativeId: 'init_q', toInitiativeId: 'init_p' },
  ];
  const issues = feasibilityIssues(initiatives, deps, seed.waves);
  const cycle = issues.find((i) => i.type === 'cycle');
  assert(cycle !== undefined, 'expected a cycle issue');
  assert(/Circular dependency/.test(cycle?.message ?? ''), 'cycle message should name the loop');
  assert((cycle?.resolution ?? '').length > 0, 'cycle issue must state a resolution');
});

/* 19 */
check('quadrantPopulation counts every scored opportunity and explains an empty Defend', () => {
  const pop = quadrantPopulation(seed.opportunities, seed.opportunityScores, model);
  eq(pop.total, seed.opportunities.length, 'every opportunity is counted once');
  const summed =
    pop.counts['Act Now'] +
    pop.counts['Defend'] +
    pop.counts['Plan & Fund'] +
    pop.counts['Sequence Later'];
  eq(summed, pop.total, 'quadrant counts sum to the total');
  eq(pop.counts['Defend'], 0, 'the seeded register does not reach Defend');
  assert(pop.emptyQuadrants.includes('Defend'), 'Defend should be reported as empty');
  assert(
    pop.notes.some((n) => n.includes('co-varies')),
    'the empty Defend quadrant must be explained, not hidden',
  );
});

/* 20 */
check('seed populates all four priority bands and three quadrants', () => {
  const view = buildEngagementView('eng_northwind', seed);
  const bands = new Set(view.opportunityRows.map((r) => r.derived?.band));
  for (const band of ['Critical', 'High Priority', 'Medium Priority', 'Lower Priority']) {
    assert(bands.has(band as never), `band ${band} is not populated in the seed`);
  }
  const quadrants = new Set(view.opportunityRows.map((r) => r.derived?.quadrant));
  assert(quadrants.size >= 3, `expected at least 3 populated quadrants, got ${quadrants.size}`);
  eq(view.opportunityRows.filter((r) => r.derived === null).length, 0, 'every opportunity is scored');
});

/* 21 */
check('seed integrity: no opportunity carries a theme, ranks are unique, ids resolve', () => {
  const initIds = new Set(seed.initiatives.map((i) => i.id));
  const capIds = new Set(seed.capabilityAreas.map((c) => c.id));
  const themeIds = new Set(seed.themes.map((t) => t.id));
  for (const opp of seed.opportunities) {
    assert(initIds.has(opp.initiativeId), `${opp.displayCode} points at a missing initiative`);
    assert(capIds.has(opp.capabilityAreaId), `${opp.displayCode} points at a missing capability`);
    assert(
      !Object.prototype.hasOwnProperty.call(opp, 'themeId'),
      `${opp.displayCode} must not carry themeId — theme is derived through the initiative`,
    );
  }
  for (const init of seed.initiatives) {
    assert(themeIds.has(init.themeId), `${init.name} points at a missing theme`);
  }
  const ranks = seed.opportunities
    .map((o) => o.clientRank)
    .filter((r): r is number => r !== null)
    .sort((a, b) => a - b);
  eq(ranks, [1, 2, 3, 4, 5, 6, 7, 8], 'eight unique client ranks 1-8');
  const focusIds = new Set(seed.maturityFocusAreas.map((f) => f.id));
  eq(focusIds.size, 28, 'expected 28 maturity focus areas');
  eq(
    seed.maturityFocusAreas.filter((f) => f.insufficientEvidence).length,
    2,
    'expected two focus areas marked insufficient evidence',
  );
  const evidenceIds = new Set(seed.evidence.map((e) => e.id));
  for (const finding of seed.findings) {
    for (const id of finding.evidenceIds) {
      assert(evidenceIds.has(id), `${finding.id} cites missing evidence ${id}`);
    }
  }
});

/* 22 */
check('seed snapshot v1 excludes the roadmap and initiatives but carries derived values', () => {
  const snapshot = seed.publishedSnapshots.find((s) => s.version === 1);
  assert(snapshot !== undefined, 'expected a published snapshot at version 1');
  eq(snapshot?.selection.includeInitiatives, false, 'v1 excludes initiatives');
  eq(snapshot?.selection.includeRoadmap, false, 'v1 excludes the roadmap');
  eq(snapshot?.payload.initiatives.length, 0, 'no initiatives in the v1 payload');
  eq(snapshot?.payload.waves.length, 0, 'no waves in the v1 payload');
  assert((snapshot?.payload.opportunities.length ?? 0) > 0, 'v1 publishes the register');
  assert(
    (snapshot?.payload.derived.opportunities.length ?? 0) ===
      (snapshot?.payload.opportunities.length ?? -1),
    'every published opportunity has derived values frozen alongside it',
  );
  assert(Object.isFrozen(snapshot), 'a published snapshot must be frozen');
  const pending = seed.clientSubmissions.filter((s) => s.status === 'pending');
  assert(pending.length >= 1, 'the review queue must not be empty on first load');
});

console.log('');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
