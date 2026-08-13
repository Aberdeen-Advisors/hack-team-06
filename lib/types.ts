/**
 * Conductor — domain model.
 *
 * Every id is a readable prefixed string (`opp_`, `init_`, `theme_`, ...).
 *
 * Invariants that the rest of the codebase relies on:
 *  - Derived values are NEVER stored. `OpportunityScore` holds integers only; the weighted
 *    score, priority band, axes and quadrant are computed in `lib/calc.ts` on every read.
 *  - `Opportunity` has no `themeId`. Theme membership is derived through `initiativeId`.
 *  - The client portal reads only from the latest `PublishedSnapshot`, never live working data.
 */

export type Role = 'aberdeen' | 'client';

export interface User {
  id: string;
  email: string;
  /** Plaintext by design — this is a demo with seeded users. See README. */
  password: string;
  name: string;
  role: Role;
  title: string;
  engagementIds: string[];
}

export type EngagementPhase =
  | 'kickoff'
  | 'fact_base'
  | 'current_state'
  | 'roadmap_v1'
  | 'investment'
  | 'alignment'
  | 'board_narrative'
  | 'activation';

export const ENGAGEMENT_PHASES: { key: EngagementPhase; label: string; sequence: number }[] = [
  { key: 'kickoff', label: 'Kickoff & Charter', sequence: 1 },
  { key: 'fact_base', label: 'Fact Base', sequence: 2 },
  { key: 'current_state', label: 'Current State', sequence: 3 },
  { key: 'roadmap_v1', label: 'Roadmap v1', sequence: 4 },
  { key: 'investment', label: 'Investment & Capacity', sequence: 5 },
  { key: 'alignment', label: 'Business Alignment', sequence: 6 },
  { key: 'board_narrative', label: 'Board Narrative', sequence: 7 },
  { key: 'activation', label: 'Activation', sequence: 8 },
];

export interface Engagement {
  id: string;
  clientName: string;
  name: string;
  phase: EngagementPhase;
  startedAt: string;
  scoringModelId: string;
  publishedVersion: number | null;
}

export type DimensionKey = 'financial_impact' | 'risk_if_deferred' | 'strategic_alignment';

export const DIMENSION_KEYS: DimensionKey[] = [
  'financial_impact',
  'risk_if_deferred',
  'strategic_alignment',
];

export type AnchorScore = 1 | 2 | 3 | 4 | 5;

export interface ScoringAnchor {
  score: AnchorScore;
  label: string;
  definition: string;
}

export interface ScoringDimension {
  key: DimensionKey;
  label: string;
  weight: number;
  anchors: ScoringAnchor[];
}

export type BandLabel = 'Critical' | 'High Priority' | 'Medium Priority' | 'Lower Priority';

export const BAND_LABELS: BandLabel[] = [
  'Critical',
  'High Priority',
  'Medium Priority',
  'Lower Priority',
];

export interface ScoringBand {
  min: number;
  label: BandLabel;
}

export interface ScoringModel {
  id: string;
  name: string;
  version: number;
  dimensions: ScoringDimension[];
  bands: ScoringBand[];
  quadrantThreshold: number;
}

export type QuadrantLabel = 'Act Now' | 'Defend' | 'Plan & Fund' | 'Sequence Later';

export const QUADRANT_LABELS: QuadrantLabel[] = [
  'Act Now',
  'Defend',
  'Plan & Fund',
  'Sequence Later',
];

export interface CapabilityArea {
  id: string;
  engagementId: string;
  name: string;
  sequence: number;
}

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export interface MaturityFocusArea {
  id: string;
  engagementId: string;
  capabilityAreaId: string;
  name: string;
  currentLevel: MaturityLevel | null;
  targetLevel: MaturityLevel | null;
  rationale: string;
  evidenceIds: string[];
  insufficientEvidence: boolean;
}

export interface MaturityFrameworkLevel {
  level: number;
  name: string;
  definition: string;
}

export interface MaturityFrameworkOption {
  id: string;
  name: string;
  levelCount: number;
  recommended: boolean;
  levels: MaturityFrameworkLevel[];
}

/**
 * Frameworks are a product-level constant, not engagement data. CMMI is the recommended
 * default; the second option exists so the UI can show that the ladder is selectable.
 */
export const MATURITY_FRAMEWORKS: MaturityFrameworkOption[] = [
  {
    id: 'framework_cmmi',
    name: 'CMMI Capability Maturity',
    levelCount: 5,
    recommended: true,
    levels: [
      {
        level: 1,
        name: 'Initial',
        definition: 'Work succeeds through individual effort; process is ad hoc and unrepeatable.',
      },
      {
        level: 2,
        name: 'Managed',
        definition: 'Work is planned and tracked at project level, but practice varies by team.',
      },
      {
        level: 3,
        name: 'Defined',
        definition: 'A standard process is documented, understood and applied across the organisation.',
      },
      {
        level: 4,
        name: 'Quantitatively Managed',
        definition: 'Process performance is measured with data and controlled against targets.',
      },
      {
        level: 5,
        name: 'Optimizing',
        definition: 'The organisation improves the process continuously using its own performance data.',
      },
    ],
  },
  {
    id: 'framework_digital_ladder',
    name: 'Digital Maturity Ladder',
    levelCount: 4,
    recommended: false,
    levels: [
      { level: 1, name: 'Manual', definition: 'Paper, email and spreadsheets carry the process end to end.' },
      { level: 2, name: 'Digitised', definition: 'Steps run in systems, but the hand-offs between them are still manual.' },
      { level: 3, name: 'Integrated', definition: 'Systems exchange data automatically and the process runs end to end.' },
      { level: 4, name: 'Intelligent', definition: 'The process adapts using analytics and automated decisioning.' },
    ],
  },
];

export const CMMI_LEVELS = MATURITY_FRAMEWORKS[0].levels;

export type EvidenceSourceType = 'interview' | 'document' | 'survey' | 'benchmark' | 'workshop';

export interface Evidence {
  id: string;
  engagementId: string;
  sourceType: EvidenceSourceType;
  sourceLabel: string;
  locator: string;
  quote: string;
  capturedAt: string;
}

export type FindingType = 'pain_point' | 'strength' | 'observation' | 'constraint';
export type Severity = 'low' | 'medium' | 'high';

export interface Finding {
  id: string;
  engagementId: string;
  capabilityAreaId: string;
  title: string;
  detail: string;
  findingType: FindingType;
  severity: Severity;
  evidenceIds: string[];
  /** How many independent sources support the finding. */
  corroboration: number;
}

export interface Theme {
  id: string;
  engagementId: string;
  name: string;
  description: string;
  sequence: number;
}

export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export const T_SHIRT_SIZES: TShirtSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export interface Initiative {
  id: string;
  engagementId: string;
  themeId: string;
  name: string;
  description: string;
  waveId: string | null;
  owner: string;
  tShirtSize: TShirtSize;
  targetOutcome: string;
  workstream: string;
}

export type RelationshipType = 'Internal' | 'B2B' | 'B2C' | 'B2B2C';
export type OpportunityStatus = 'New' | 'Existing' | 'Updated';

export interface Opportunity {
  id: string;
  engagementId: string;
  /** Theme is derived through this initiative — an Opportunity never carries a themeId. */
  initiativeId: string;
  displayCode: string;
  title: string;
  description: string;
  capabilityAreaId: string;
  relationshipType: RelationshipType;
  status: OpportunityStatus;
  linkedFindingIds: string[];
  clientRank: number | null;
  tShirtSize: TShirtSize;
  owner: string;
}

export interface OpportunityScore {
  id: string;
  opportunityId: string;
  scoringModelId: string;
  financialImpact: AnchorScore;
  riskIfDeferred: AnchorScore;
  strategicAlignment: AnchorScore;
  rationale: Record<DimensionKey, string>;
  evidenceIds: Record<DimensionKey, string[]>;
  scoredBy: string;
  scoredAt: string;
}

export type DependencyType =
  | 'finish_to_start'
  | 'start_to_start'
  | 'enables'
  | 'shares_resource'
  | 'mutually_exclusive';

export type DependencySource = 'workshop' | 'ai_inferred' | 'architecture' | 'client_suggested';
export type DependencyStrength = 'hard' | 'soft';

export interface Dependency {
  id: string;
  engagementId: string;
  fromInitiativeId: string;
  toInitiativeId: string;
  type: DependencyType;
  rationale: string;
  source: DependencySource;
  strength: DependencyStrength;
}

export interface Wave {
  id: string;
  engagementId: string;
  label: string;
  sequence: number;
  startsOn: string;
  endsOn: string;
  targetOutcome: string;
}

export interface Decision {
  id: string;
  engagementId: string;
  title: string;
  question: string;
  optionsConsidered: string[];
  decision: string;
  rationale: string;
  decidedBy: string;
  decidedAt: string;
  affectedIds: string[];
}

export type AICapability =
  | 'maturity_level_proposal'
  | 'opportunity_score_proposal'
  | 'dependency_inference'
  | 'duplicate_merge_proposal'
  | 'board_headline_draft';

export type ConfidenceBand = 'low' | 'medium' | 'high';
export type SuggestionStatus = 'proposed' | 'accepted' | 'edited' | 'rejected';

export interface AISuggestion {
  id: string;
  engagementId: string;
  capability: AICapability;
  capabilityLabel: string;
  targetType: 'maturity_focus_area' | 'opportunity' | 'initiative' | 'engagement';
  targetId: string;
  payload: unknown;
  confidence: number;
  confidenceBand: ConfidenceBand;
  evidenceIds: string[];
  rationale: string;
  status: SuggestionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** Mocked model outputs for the demo, e.g. `mock-v1`. */
  modelVersion: string;
  createdAt: string;
}

/** Payload shapes for the mocked suggestions, so route handlers can apply them safely. */
export interface MaturityProposalPayload {
  currentLevel?: MaturityLevel;
  targetLevel?: MaturityLevel;
  rationale?: string;
}
export interface ScoreProposalPayload {
  financialImpact: AnchorScore;
  riskIfDeferred: AnchorScore;
  strategicAlignment: AnchorScore;
  rationale: Record<DimensionKey, string>;
}
export interface DependencyProposalPayload {
  fromInitiativeId: string;
  toInitiativeId: string;
  type: DependencyType;
  strength: DependencyStrength;
  rationale: string;
}
export interface MergeProposalPayload {
  keepOpportunityId: string;
  mergeOpportunityId: string;
  mergedTitle: string;
  mergedDescription: string;
}
export interface HeadlineProposalPayload {
  headline: string;
  supportingLine: string;
}

export interface PublishSelection {
  includeCurrentState: boolean;
  includeMaturityHeatmap: boolean;
  includeOpportunities: boolean;
  includeInitiatives: boolean;
  includeRoadmap: boolean;
  includeDecisions: boolean;
  includeScores: boolean;
  allowComments: boolean;
  allowRanking: boolean;
  allowDependencySuggestions: boolean;
  allowTimingFeedback: boolean;
}

/** Derived values frozen into a snapshot at publish time. */
export interface PublishedOpportunityDerived {
  opportunityId: string;
  weighted: number | null;
  band: BandLabel | null;
  businessValue: number | null;
  urgency: number | null;
  quadrant: QuadrantLabel | null;
}

export interface PublishedInitiativeDerived {
  initiativeId: string;
  meanWeighted: number | null;
  opportunityCount: number;
  band: BandLabel | null;
  maxTShirtSize: TShirtSize | null;
  bestClientRank: number | null;
}

export interface PublishedThemeDerived {
  themeId: string;
  opportunityCount: number;
  sharePct: number;
  meanWeighted: number | null;
  countByBand: Record<BandLabel, number>;
}

export interface PublishedPayload {
  engagement: Engagement;
  scoringModel: ScoringModel | null;
  capabilityAreas: CapabilityArea[];
  maturityFocusAreas: MaturityFocusArea[];
  findings: Finding[];
  evidence: Evidence[];
  themes: Theme[];
  initiatives: Initiative[];
  opportunities: Opportunity[];
  opportunityScores: OpportunityScore[];
  dependencies: Dependency[];
  waves: Wave[];
  decisions: Decision[];
  derived: {
    opportunities: PublishedOpportunityDerived[];
    initiatives: PublishedInitiativeDerived[];
    themes: PublishedThemeDerived[];
    maturityByCapabilityArea: {
      capabilityAreaId: string;
      meanCurrent: number | null;
      meanTarget: number | null;
      meanGap: number | null;
      countAssessed: number;
      countInsufficientEvidence: number;
    }[];
  };
}

export interface PublishedSnapshot {
  id: string;
  engagementId: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  note: string;
  selection: PublishSelection;
  payload: PublishedPayload;
}

export type SubmissionKind =
  | 'comment'
  | 'ranking'
  | 'edit'
  | 'dependency_suggestion'
  | 'timing_feedback';

export type SubmissionTargetType = 'initiative' | 'opportunity' | 'roadmap' | 'engagement';
export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

export interface ClientSubmission {
  id: string;
  engagementId: string;
  snapshotVersion: number;
  kind: SubmissionKind;
  targetType: SubmissionTargetType;
  targetId: string | null;
  body: string;
  payload: unknown;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: SubmissionStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  appliedChange: string | null;
}

/** Payload shapes a client submission may carry. */
export interface RankingSubmissionPayload {
  clientRank: number;
}
export interface DependencySuggestionPayload {
  fromInitiativeId: string;
  toInitiativeId: string;
  type: DependencyType;
  strength: DependencyStrength;
  rationale: string;
}
export interface TimingFeedbackPayload {
  waveId: string;
}

export interface AuditEvent {
  id: string;
  engagementId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  at: string;
}

export interface Database {
  users: User[];
  engagements: Engagement[];
  scoringModels: ScoringModel[];
  capabilityAreas: CapabilityArea[];
  maturityFocusAreas: MaturityFocusArea[];
  evidence: Evidence[];
  findings: Finding[];
  themes: Theme[];
  initiatives: Initiative[];
  opportunities: Opportunity[];
  opportunityScores: OpportunityScore[];
  dependencies: Dependency[];
  waves: Wave[];
  decisions: Decision[];
  aiSuggestions: AISuggestion[];
  publishedSnapshots: PublishedSnapshot[];
  clientSubmissions: ClientSubmission[];
  auditEvents: AuditEvent[];
}

/** The session payload carried in the signed cookie. */
export interface SessionPayload {
  userId: string;
  role: Role;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string;
  engagementIds: string[];
}
