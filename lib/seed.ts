/**
 * Conductor — seed data for the Northwind Distribution demo engagement.
 *
 * Northwind Distribution is fictional: a mid-market wholesale distributor, ~GBP 480m revenue,
 * three distribution centres, ~1,100 staff. Every quote, finding and score below is invented
 * for the demo but modelled on the shapes a real transformation fact base produces.
 *
 * `buildSeed()` returns a fresh object graph on every call, so `resetToSeed()` cannot hand back
 * data that a previous run mutated.
 */

import { buildSnapshot } from './publish';
import type {
  AISuggestion,
  AnchorScore,
  CapabilityArea,
  ClientSubmission,
  Database,
  Decision,
  Dependency,
  DimensionKey,
  Engagement,
  Evidence,
  Finding,
  Initiative,
  MaturityFocusArea,
  MaturityLevel,
  Opportunity,
  OpportunityScore,
  PublishSelection,
  RelationshipType,
  ScoringModel,
  Severity,
  TShirtSize,
  Theme,
  User,
  Wave,
} from './types';

const ENGAGEMENT_ID = 'eng_northwind';
const MODEL_ID = 'model_northwind_v1';
const NOW = '2026-08-10T09:00:00.000Z';

/* ------------------------------------------------------------------ users */

function users(): User[] {
  return [
    {
      id: 'user_liv',
      email: 'liv@aberdeenadvisors.com',
      password: 'conductor2026',
      name: 'Liv DeSantis',
      role: 'aberdeen',
      title: 'Engagement Lead',
      engagementIds: [ENGAGEMENT_ID],
    },
    {
      id: 'user_ashmi',
      email: 'ashmi@aberdeenadvisors.com',
      password: 'conductor2026',
      name: 'Ashmi Chandra',
      role: 'aberdeen',
      title: 'Analyst',
      engagementIds: [ENGAGEMENT_ID],
    },
    {
      id: 'user_dana',
      email: 'cio@northwind-distribution.com',
      password: 'client2026',
      name: 'Dana Whitfield',
      role: 'client',
      title: 'Chief Information Officer',
      engagementIds: [ENGAGEMENT_ID],
    },
    {
      id: 'user_marcus',
      email: 'coo@northwind-distribution.com',
      password: 'client2026',
      name: 'Marcus Reed',
      role: 'client',
      title: 'Chief Operating Officer',
      engagementIds: [ENGAGEMENT_ID],
    },
  ];
}

/* --------------------------------------------------------------- scoring */

function scoringModel(): ScoringModel {
  return {
    id: MODEL_ID,
    name: 'Aberdeen Opportunity Prioritisation v1',
    version: 1,
    quadrantThreshold: 3.5,
    bands: [
      { min: 4.5, label: 'Critical' },
      { min: 3.75, label: 'High Priority' },
      { min: 2.8, label: 'Medium Priority' },
      { min: 0, label: 'Lower Priority' },
    ],
    dimensions: [
      {
        key: 'financial_impact',
        label: 'Financial Impact',
        weight: 0.4,
        anchors: [
          {
            score: 5,
            label: 'Transformational',
            definition: 'Moves a headline P&L line by more than 2 percent of revenue or margin.',
          },
          {
            score: 4,
            label: 'Material',
            definition: 'A quantified benefit case in the millions that lands inside the plan horizon.',
          },
          {
            score: 3,
            label: 'Moderate',
            definition: 'A credible six-figure benefit, sized but not yet fully underwritten.',
          },
          {
            score: 2,
            label: 'Indirect',
            definition: 'Benefit is real but arrives through another initiative rather than on its own.',
          },
          {
            score: 1,
            label: 'Hygiene',
            definition: 'No attributable financial benefit; done because it must be done.',
          },
        ],
      },
      {
        key: 'risk_if_deferred',
        label: 'Risk if Deferred',
        weight: 0.35,
        anchors: [
          {
            score: 5,
            label: 'Existential',
            definition: 'Deferral risks trading capability, regulatory standing or customer exit.',
          },
          {
            score: 4,
            label: 'Severe',
            definition: 'Deferral causes major service or control failure within twelve months.',
          },
          {
            score: 3,
            label: 'Compounding',
            definition: 'Cost and complexity grow measurably each quarter the work is delayed.',
          },
          {
            score: 2,
            label: 'Latent',
            definition: 'Known weakness with no near-term trigger; contained by workarounds.',
          },
          {
            score: 1,
            label: 'Negligible',
            definition: 'Deferral changes nothing material for at least two years.',
          },
        ],
      },
      {
        key: 'strategic_alignment',
        label: 'Strategic Alignment',
        weight: 0.25,
        anchors: [
          {
            score: 5,
            label: 'Named explicitly',
            definition: 'Named in the board strategy document as a required outcome.',
          },
          {
            score: 4,
            label: 'Direct enabler',
            definition: 'Directly delivers a named strategic objective without intermediate steps.',
          },
          {
            score: 3,
            label: 'Foundational dependency',
            definition: 'Not named itself, but a stated objective cannot be reached without it.',
          },
          {
            score: 2,
            label: 'Thematic fit',
            definition: 'Consistent with the strategic direction but not required by any objective.',
          },
          {
            score: 1,
            label: 'Not traceable',
            definition: 'No line of sight to any stated strategic objective.',
          },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------ engagement */

function engagement(): Engagement {
  return {
    id: ENGAGEMENT_ID,
    clientName: 'Northwind Distribution',
    name: 'Northwind Distribution — Technology & Operations Transformation Roadmap',
    phase: 'roadmap_v1',
    startedAt: '2026-05-18T08:00:00.000Z',
    scoringModelId: MODEL_ID,
    publishedVersion: 1,
  };
}

/* ------------------------------------------------------ capability areas */

const CAP: Record<string, string> = {
  order_to_cash: 'cap_order_to_cash',
  warehouse: 'cap_warehouse',
  inventory: 'cap_inventory',
  procurement: 'cap_procurement',
  data: 'cap_data',
  platform: 'cap_platform',
  cyber: 'cap_cyber',
  commercial: 'cap_commercial',
};

function capabilityAreas(): CapabilityArea[] {
  const rows: [string, string][] = [
    [CAP.order_to_cash, 'Order to Cash'],
    [CAP.warehouse, 'Warehouse & Fulfilment'],
    [CAP.inventory, 'Inventory & Demand Planning'],
    [CAP.procurement, 'Procurement & Supplier Management'],
    [CAP.data, 'Data & Analytics'],
    [CAP.platform, 'Core Platform & Integration'],
    [CAP.cyber, 'Cyber & IT Resilience'],
    [CAP.commercial, 'Commercial & Digital Channels'],
  ];
  return rows.map(([id, name], i) => ({
    id,
    engagementId: ENGAGEMENT_ID,
    name,
    sequence: i + 1,
  }));
}

/* ------------------------------------------------------------- evidence */

function evidence(): Evidence[] {
  const rows: [string, Evidence['sourceType'], string, string, string, string][] = [
    [
      'ev_001',
      'interview',
      'CIO interview — Dana Whitfield',
      'Transcript p.3',
      'The ERP core went out of vendor support in March. Every change we make now is a change we own forever.',
      '2026-05-26T10:00:00.000Z',
    ],
    [
      'ev_002',
      'interview',
      'COO interview — Marcus Reed',
      'Transcript p.7',
      'Three of my sites still key orders in by hand from emailed PDFs. On a Monday that is two people for a full shift.',
      '2026-05-27T14:00:00.000Z',
    ],
    [
      'ev_003',
      'document',
      'Order intake volume analysis FY26',
      'Tab: channel_mix',
      '41 percent of order lines arrive by email or phone and are re-keyed into the ERP.',
      '2026-06-02T09:00:00.000Z',
    ],
    [
      'ev_004',
      'document',
      'Customer master extract',
      'Rows 1-48,200',
      '48,200 customer records with 6,400 suspected duplicates on name and postcode match.',
      '2026-06-03T09:00:00.000Z',
    ],
    [
      'ev_005',
      'workshop',
      'Fact base validation workshop',
      'Session 2, flipchart 4',
      'Finance confirmed month-end close takes nine working days, of which four are reconciliation.',
      '2026-06-11T13:00:00.000Z',
    ],
    [
      'ev_006',
      'interview',
      'Head of DC Operations',
      'Transcript p.2',
      'Pickers walk the route they remember, not the route the system suggests, because the system does not suggest one.',
      '2026-06-04T11:00:00.000Z',
    ],
    [
      'ev_007',
      'benchmark',
      'Wholesale distribution operations benchmark 2026',
      'Table 12',
      'Upper-quartile distributors hold 38 days of inventory; the peer median is 52.',
      '2026-06-09T09:00:00.000Z',
    ],
    [
      'ev_008',
      'document',
      'Inventory position report June 2026',
      'Summary sheet',
      'Group inventory stands at 61 days of cover with 11 percent of SKUs holding over a year of stock.',
      '2026-06-15T09:00:00.000Z',
    ],
    [
      'ev_009',
      'survey',
      'IT capability self-assessment',
      'Question 14, n=42',
      'Only 19 percent of respondents could name the system of record for product pricing.',
      '2026-06-18T09:00:00.000Z',
    ],
    [
      'ev_010',
      'document',
      'Penetration test report',
      'Findings 2 and 5',
      'Remote administrative access to warehouse systems available without multi-factor authentication.',
      '2026-06-22T09:00:00.000Z',
    ],
    [
      'ev_011',
      'interview',
      'Group Finance Director',
      'Transcript p.5',
      'We discount at the branch to win the order and find out the margin six weeks later, in a spreadsheet.',
      '2026-06-25T15:00:00.000Z',
    ],
    [
      'ev_012',
      'document',
      'Margin analysis — manual price overrides',
      'Pivot: override_by_branch',
      'Manual price overrides applied to 23 percent of order lines, averaging 4.1 points of margin.',
      '2026-06-26T09:00:00.000Z',
    ],
    [
      'ev_013',
      'workshop',
      'Architecture review workshop',
      'Session 3, whiteboard 2',
      'Fourteen point-to-point integrations run on overnight file transfer with no monitoring or replay.',
      '2026-07-01T10:00:00.000Z',
    ],
    [
      'ev_014',
      'document',
      'Board strategy paper FY27-FY29',
      'Section 2, objective 3',
      'Named objective: half of all order value transacted through digital self-serve channels by FY29.',
      '2026-07-06T09:00:00.000Z',
    ],
  ];
  return rows.map(([id, sourceType, sourceLabel, locator, quote, capturedAt]) => ({
    id,
    engagementId: ENGAGEMENT_ID,
    sourceType,
    sourceLabel,
    locator,
    quote,
    capturedAt,
  }));
}

/* ------------------------------------------------------- maturity ratings */

interface FocusSeed {
  id: string;
  cap: string;
  name: string;
  current: MaturityLevel | null;
  target: MaturityLevel | null;
  rationale: string;
  evidenceIds: string[];
  insufficient?: boolean;
}

function maturityFocusAreas(): MaturityFocusArea[] {
  const rows: FocusSeed[] = [
    // Order to Cash
    { id: 'mfa_001', cap: CAP.order_to_cash, name: 'Order capture and validation', current: 2, target: 4, rationale: '41 percent of order lines are re-keyed from email or phone; validation is human judgement.', evidenceIds: ['ev_002', 'ev_003'] },
    { id: 'mfa_002', cap: CAP.order_to_cash, name: 'Credit and customer onboarding', current: 2, target: 3, rationale: 'Onboarding is documented but executed differently at each branch.', evidenceIds: ['ev_002'] },
    { id: 'mfa_003', cap: CAP.order_to_cash, name: 'Invoicing and dispute resolution', current: 3, target: 4, rationale: 'A standard process exists; dispute cycle time is not measured.', evidenceIds: ['ev_005'] },
    { id: 'mfa_004', cap: CAP.order_to_cash, name: 'Financial close and reconciliation', current: 2, target: 4, rationale: 'Nine-day close with four days of manual reconciliation.', evidenceIds: ['ev_005'] },
    // Warehouse & Fulfilment
    { id: 'mfa_005', cap: CAP.warehouse, name: 'Picking and packing execution', current: 2, target: 4, rationale: 'No directed picking; route knowledge is held by individuals.', evidenceIds: ['ev_006'] },
    { id: 'mfa_006', cap: CAP.warehouse, name: 'Goods-in and putaway', current: 2, target: 4, rationale: 'Paper-based goods-in with barcode scanning at two of three sites.', evidenceIds: ['ev_006'] },
    { id: 'mfa_007', cap: CAP.warehouse, name: 'Stock accuracy and counting', current: 2, target: 4, rationale: 'Annual stocktake only; no perpetual cycle counting.', evidenceIds: ['ev_008'] },
    { id: 'mfa_008', cap: CAP.warehouse, name: 'Returns and reverse logistics', current: 1, target: 3, rationale: 'Returns are handled case by case with no standard route.', evidenceIds: ['ev_006'] },
    // Inventory & Demand Planning
    { id: 'mfa_009', cap: CAP.inventory, name: 'Demand forecasting', current: 1, target: 4, rationale: 'Forecast is a spreadsheet maintained by one planner, unversioned.', evidenceIds: ['ev_008', 'ev_007'] },
    { id: 'mfa_010', cap: CAP.inventory, name: 'Replenishment and ordering', current: 2, target: 4, rationale: 'Reorder points are static and reviewed annually.', evidenceIds: ['ev_008'] },
    { id: 'mfa_011', cap: CAP.inventory, name: 'Inventory optimisation', current: 1, target: 3, rationale: '61 days of cover against a 38-day upper quartile benchmark.', evidenceIds: ['ev_007', 'ev_008'] },
    { id: 'mfa_012', cap: CAP.inventory, name: 'Sales and operations planning', current: 2, target: 4, rationale: 'Monthly meeting happens; inputs are not reconciled to one plan.', evidenceIds: ['ev_005'] },
    // Procurement & Supplier Management
    { id: 'mfa_013', cap: CAP.procurement, name: 'Supplier selection and onboarding', current: 3, target: 4, rationale: 'Defined process owned by category managers and applied consistently.', evidenceIds: ['ev_009'] },
    { id: 'mfa_014', cap: CAP.procurement, name: 'Purchase order management', current: 2, target: 3, rationale: 'Orders raised in the ERP but approvals routed by email.', evidenceIds: ['ev_009'] },
    { id: 'mfa_015', cap: CAP.procurement, name: 'Supplier performance management', current: null, target: 3, rationale: 'No performance data was available in the fact base window; rating deferred.', evidenceIds: [], insufficient: true },
    // Data & Analytics
    { id: 'mfa_016', cap: CAP.data, name: 'Master data governance', current: 1, target: 4, rationale: '6,400 suspected duplicate customer records; no owner named for customer master.', evidenceIds: ['ev_004', 'ev_009'] },
    { id: 'mfa_017', cap: CAP.data, name: 'Reporting and self-serve analytics', current: 2, target: 4, rationale: 'Reports are extracted to spreadsheets and circulated by email.', evidenceIds: ['ev_009'] },
    { id: 'mfa_018', cap: CAP.data, name: 'Data quality management', current: 1, target: 3, rationale: 'No data quality measurement exists in any domain.', evidenceIds: ['ev_004'] },
    { id: 'mfa_019', cap: CAP.data, name: 'Advanced analytics and AI', current: 1, target: 3, rationale: 'No production models; two proofs of concept abandoned in FY25.', evidenceIds: ['ev_009'] },
    // Core Platform & Integration
    { id: 'mfa_020', cap: CAP.platform, name: 'ERP platform currency', current: 1, target: 4, rationale: 'Core ERP out of vendor support since March 2026.', evidenceIds: ['ev_001'] },
    { id: 'mfa_021', cap: CAP.platform, name: 'Integration architecture', current: 1, target: 4, rationale: 'Fourteen point-to-point overnight file transfers with no monitoring.', evidenceIds: ['ev_013'] },
    { id: 'mfa_022', cap: CAP.platform, name: 'Application portfolio management', current: 2, target: 3, rationale: 'An inventory exists but lifecycle decisions are made ad hoc.', evidenceIds: ['ev_013'] },
    { id: 'mfa_023', cap: CAP.platform, name: 'Release and change management', current: 2, target: 4, rationale: 'Changes are tracked; testing depth varies by team.', evidenceIds: ['ev_001'] },
    // Cyber & IT Resilience
    { id: 'mfa_024', cap: CAP.cyber, name: 'Identity and access management', current: 1, target: 4, rationale: 'Remote administrative access available without multi-factor authentication.', evidenceIds: ['ev_010'] },
    { id: 'mfa_025', cap: CAP.cyber, name: 'Disaster recovery and continuity', current: 2, target: 4, rationale: 'Recovery plans documented for finance systems, untested for warehouse systems.', evidenceIds: ['ev_010'] },
    { id: 'mfa_026', cap: CAP.cyber, name: 'Vulnerability and patch management', current: 2, target: 4, rationale: 'Patching runs monthly with no compliance reporting.', evidenceIds: ['ev_010'] },
    // Commercial & Digital Channels
    { id: 'mfa_027', cap: CAP.commercial, name: 'Digital self-serve channel', current: 1, target: 4, rationale: 'No customer-facing ordering channel against a named FY29 objective.', evidenceIds: ['ev_014', 'ev_003'] },
    { id: 'mfa_028', cap: CAP.commercial, name: 'Pricing and margin management', current: null, target: 4, rationale: 'Override data obtained late and not yet validated with commercial leadership; rating deferred.', evidenceIds: ['ev_012'], insufficient: true },
  ];
  return rows.map((r) => ({
    id: r.id,
    engagementId: ENGAGEMENT_ID,
    capabilityAreaId: r.cap,
    name: r.name,
    currentLevel: r.current,
    targetLevel: r.target,
    rationale: r.rationale,
    evidenceIds: r.evidenceIds,
    insufficientEvidence: r.insufficient ?? false,
  }));
}

/* -------------------------------------------------------------- findings */

function findings(): Finding[] {
  const rows: [string, string, string, string, Finding['findingType'], Severity, string[], number][] =
    [
      ['find_001', CAP.platform, 'ERP core is out of vendor support', 'The core ERP left vendor support in March 2026. Security patches and regulatory updates are no longer supplied, and every future change becomes a bespoke change Northwind maintains itself.', 'pain_point', 'high', ['ev_001'], 3],
      ['find_002', CAP.order_to_cash, 'Two in five order lines are re-keyed by hand', '41 percent of order lines arrive by email or phone and are typed into the ERP by branch staff, concentrating effort on Monday mornings and introducing transcription errors into fulfilment.', 'pain_point', 'high', ['ev_002', 'ev_003'], 3],
      ['find_003', CAP.order_to_cash, 'Month-end close takes nine working days', 'Four of the nine days are manual reconciliation between the ERP, the warehouse system and the bank, delaying management information past the point of usefulness.', 'pain_point', 'medium', ['ev_005'], 2],
      ['find_004', CAP.data, 'Customer master holds an estimated 6,400 duplicates', 'Duplicate customer records fragment credit exposure, spend visibility and delivery history, and make any customer-level analysis unreliable.', 'pain_point', 'high', ['ev_004'], 2],
      ['find_005', CAP.warehouse, 'Picking depends on individual route knowledge', 'The warehouse system does not propose a pick route, so productivity is a function of tenure and new pickers take months to reach standard.', 'pain_point', 'medium', ['ev_006'], 2],
      ['find_006', CAP.inventory, 'Inventory cover is 23 days above upper-quartile peers', 'Group cover stands at 61 days against a 38-day upper quartile, with 11 percent of SKUs holding more than a year of stock; working capital is trapped in slow lines.', 'pain_point', 'high', ['ev_007', 'ev_008'], 3],
      ['find_007', CAP.commercial, 'Margin is discounted at the branch and discovered later', 'Manual price overrides touch 23 percent of order lines and average 4.1 points of margin, visible only in a spreadsheet produced weeks after the sale.', 'pain_point', 'high', ['ev_011', 'ev_012'], 3],
      ['find_008', CAP.cyber, 'Remote administrative access lacks multi-factor authentication', 'The penetration test reached administrative interfaces on warehouse systems from outside the network with a single factor. A successful intrusion would stop despatch.', 'pain_point', 'high', ['ev_010'], 1],
      ['find_009', CAP.platform, 'Fourteen unmonitored overnight file transfers carry critical data', 'Integrations run as scheduled file transfers with no monitoring, alerting or replay, so a silent overnight failure is discovered by its business consequence.', 'pain_point', 'high', ['ev_013'], 2],
      ['find_010', CAP.warehouse, 'Despatch reliability is a genuine strength', 'Despite manual processes, on-time despatch has held above 97 percent for eight quarters, sustained by experienced supervisors. This is a strength to protect through any change.', 'strength', 'low', ['ev_006'], 2],
      ['find_011', CAP.procurement, 'Category management practice is well defined', 'Supplier selection follows a documented process applied consistently across categories, giving a foundation that procurement automation can build on rather than replace.', 'strength', 'low', ['ev_009'], 1],
      ['find_012', CAP.platform, 'Change capacity is capped by a small integration team', 'Four engineers hold all integration knowledge and are already committed to run-the-business work, which constrains how much sequencing can be parallelised in any wave.', 'constraint', 'medium', ['ev_013', 'ev_001'], 2],
    ];
  return rows.map(([id, cap, title, detail, findingType, severity, evidenceIds, corroboration]) => ({
    id,
    engagementId: ENGAGEMENT_ID,
    capabilityAreaId: cap,
    title,
    detail,
    findingType,
    severity,
    evidenceIds,
    corroboration,
  }));
}

/* ---------------------------------------------------------------- themes */

const THEME = {
  stabilize: 'theme_stabilize_core',
  protect: 'theme_protect_investments',
  grow: 'theme_grow_top_line',
  intelligent: 'theme_intelligent_enterprise',
};

function themes(): Theme[] {
  return [
    {
      id: THEME.stabilize,
      engagementId: ENGAGEMENT_ID,
      name: 'Stabilize the Core',
      description:
        'Return the transactional backbone to a supported, monitored and predictable state so that everything else can be built on it.',
      sequence: 1,
    },
    {
      id: THEME.protect,
      engagementId: ENGAGEMENT_ID,
      name: 'Assess and Protect Current Investments',
      description:
        'Secure and get full value from what Northwind already owns before buying anything new.',
      sequence: 2,
    },
    {
      id: THEME.grow,
      engagementId: ENGAGEMENT_ID,
      name: 'Grow the Top Line',
      description:
        'Open digital channels and recover margin discipline against the board objective of half of order value transacted digitally by FY29.',
      sequence: 3,
    },
    {
      id: THEME.intelligent,
      engagementId: ENGAGEMENT_ID,
      name: 'Build the Intelligent Enterprise',
      description:
        'Use the stabilised data foundation for forecasting, automation and decision support that compounds over time.',
      sequence: 4,
    },
  ];
}

/* ----------------------------------------------------------------- waves */

const WAVE = { w1: 'wave_1', w2: 'wave_2', w3: 'wave_3', w4: 'wave_4' };

function waves(): Wave[] {
  return [
    {
      id: WAVE.w1,
      engagementId: ENGAGEMENT_ID,
      label: 'Wave 1 — H1 2027',
      sequence: 1,
      startsOn: '2027-01-04',
      endsOn: '2027-06-30',
      targetOutcome: 'Core platform supported again and identity risk closed.',
    },
    {
      id: WAVE.w2,
      engagementId: ENGAGEMENT_ID,
      label: 'Wave 2 — H2 2027',
      sequence: 2,
      startsOn: '2027-07-01',
      endsOn: '2027-12-31',
      targetOutcome: 'Integration monitored and replayable; warehouse execution directed by system.',
    },
    {
      id: WAVE.w3,
      engagementId: ENGAGEMENT_ID,
      label: 'Wave 3 — H1 2028',
      sequence: 3,
      startsOn: '2028-01-03',
      endsOn: '2028-06-30',
      targetOutcome: 'Digital channel live with governed pricing behind it.',
    },
    {
      id: WAVE.w4,
      engagementId: ENGAGEMENT_ID,
      label: 'Wave 4 — H2 2028',
      sequence: 4,
      startsOn: '2028-07-01',
      endsOn: '2028-12-31',
      targetOutcome: 'Forecasting and analytics products in production use.',
    },
  ];
}

/* ------------------------------------------------------------ initiatives */

const INIT = {
  erp: 'init_erp_core',
  master: 'init_master_data',
  integration: 'init_integration_layer',
  cyber: 'init_cyber_uplift',
  wms: 'init_wms_optimisation',
  apprat: 'init_app_rationalisation',
  portal: 'init_b2b_portal',
  pricing: 'init_pricing_engine',
  fieldsales: 'init_field_sales',
  forecast: 'init_demand_forecasting',
  analytics: 'init_analytics_platform',
  automation: 'init_warehouse_automation',
};

function initiatives(): Initiative[] {
  const rows: [string, string, string, string, string | null, string, TShirtSize, string, string][] =
    [
      [INIT.erp, THEME.stabilize, 'ERP Core Upgrade', 'Move the core ERP onto the supported current release, retiring bespoke modifications where a standard capability now exists.', WAVE.w1, 'Dana Whitfield', 'XXL', 'Supported platform with a repeatable upgrade path and no unsupported customisations.', 'Core Platform'],
      // Owner deliberately unset: this initiative blocks two others, so the feasibility check
      // reports a missing owner on the critical path.
      [INIT.master, THEME.stabilize, 'Master Data Foundation', 'Establish ownership, governance and de-duplication for customer, product and supplier master data.', WAVE.w1, '', 'L', 'One trusted record per customer, product and supplier with a named data owner.', 'Data'],
      [INIT.integration, THEME.stabilize, 'Integration Layer Replatform', 'Replace overnight point-to-point file transfers with a monitored event-based integration layer.', WAVE.w2, 'Priya Ramanathan', 'L', 'Every integration monitored, alerted and replayable within one hour.', 'Core Platform'],
      [INIT.cyber, THEME.protect, 'Cyber Resilience Uplift', 'Close the identity, recovery and patch findings raised by the penetration test.', WAVE.w1, 'Tom Aldridge', 'M', 'No single-factor privileged access and a tested recovery plan for despatch-critical systems.', 'Security'],
      [INIT.wms, THEME.protect, 'WMS Optimisation', 'Turn on the warehouse capabilities Northwind already licenses: directed picking, slotting and scanning.', WAVE.w2, 'Marcus Reed', 'L', 'Directed picking at all three sites with stock accuracy above 98 percent.', 'Operations'],
      [INIT.apprat, THEME.protect, 'Application Rationalisation', 'Retire or consolidate duplicated and end-of-life applications identified in the portfolio review.', WAVE.w3, 'Priya Ramanathan', 'M', 'Portfolio reduced by at least twelve applications with licence savings realised.', 'Core Platform'],
      [INIT.portal, THEME.grow, 'B2B Customer Portal', 'Launch a self-serve ordering and account channel for trade customers.', WAVE.w2, 'Sofia Marchetti', 'L', 'A quarter of order value transacted through self-serve within a year of launch.', 'Digital'],
      [INIT.pricing, THEME.grow, 'Dynamic Pricing Engine', 'Centralise price list management and bring visibility and control to branch-level overrides.', WAVE.w3, 'Sofia Marchetti', 'M', 'Override leakage reduced by two margin points with pricing owned in one system.', 'Commercial'],
      [INIT.fieldsales, THEME.grow, 'Field Sales Enablement', 'Give field representatives mobile order capture and account visibility on the road.', WAVE.w3, 'Callum Barrett', 'S', 'Field orders captured at the point of conversation rather than re-keyed later.', 'Commercial'],
      [INIT.forecast, THEME.intelligent, 'AI Demand Forecasting', 'Replace the spreadsheet forecast with a statistical demand model feeding replenishment.', WAVE.w3, 'Ines Okafor', 'L', 'Forecast accuracy improved to peer upper quartile with inventory cover reduced to 45 days.', 'Data'],
      [INIT.analytics, THEME.intelligent, 'Analytics Platform & Data Products', 'Stand up a governed analytics platform with a certified KPI layer for board and operational reporting.', WAVE.w4, 'Ines Okafor', 'L', 'One certified set of KPI definitions used by the board pack and operational reporting alike.', 'Data'],
      [INIT.automation, THEME.intelligent, 'Warehouse Automation Pilot', 'Pilot goods-to-person automation in the main distribution centre ahead of a network decision.', null, 'Marcus Reed', 'XL', 'An evidenced automation business case with a pilot running in the main DC.', 'Operations'],
    ];
  return rows.map(
    ([id, themeId, name, description, waveId, owner, tShirtSize, targetOutcome, workstream]) => ({
      id,
      engagementId: ENGAGEMENT_ID,
      themeId,
      name,
      description,
      waveId,
      owner,
      tShirtSize,
      targetOutcome,
      workstream,
    }),
  );
}

/* --------------------------------------------------------- opportunities */

interface OppSeed {
  n: number;
  init: string;
  cap: string;
  title: string;
  description: string;
  rel: RelationshipType;
  status: Opportunity['status'];
  fi: AnchorScore;
  rd: AnchorScore;
  sa: AnchorScore;
  size: TShirtSize;
  owner: string;
  findings: string[];
  ev: string[];
  rank?: number;
}

/**
 * Scores are spread so that all four priority bands are populated and three of the four
 * quadrants are. "Defend" is deliberately empty — see `quadrantPopulation` in lib/calc.ts:
 * the axis definition makes it near-unreachable, and the product surfaces that rather than
 * inventing a member for it.
 */
const OPP_SEEDS: OppSeed[] = [
  { n: 1, init: INIT.erp, cap: CAP.platform, title: 'Move ERP core to the supported release', description: 'Upgrade the core ERP to the current supported release and retire the modifications that a standard capability now covers.', rel: 'Internal', status: 'Existing', fi: 5, rd: 5, sa: 5, size: 'XXL', owner: 'Dana Whitfield', findings: ['find_001'], ev: ['ev_001'], rank: 1 },
  { n: 2, init: INIT.erp, cap: CAP.order_to_cash, title: 'Consolidate three order-entry paths into one', description: 'Replace branch, phone and email order entry with a single validated intake path in the ERP.', rel: 'Internal', status: 'Existing', fi: 5, rd: 5, sa: 4, size: 'L', owner: 'Marcus Reed', findings: ['find_002'], ev: ['ev_002', 'ev_003'], rank: 3 },
  { n: 3, init: INIT.erp, cap: CAP.platform, title: 'Retire bespoke pricing scripts in the ERP', description: 'Remove the custom pricing scripts that block upgrades, moving the logic to configuration.', rel: 'Internal', status: 'New', fi: 4, rd: 4, sa: 4, size: 'M', owner: 'Priya Ramanathan', findings: ['find_001', 'find_007'], ev: ['ev_001'] },
  { n: 4, init: INIT.erp, cap: CAP.order_to_cash, title: 'Automate month-end reconciliation', description: 'Automate the ERP, warehouse and bank reconciliation that consumes four days of every close.', rel: 'Internal', status: 'New', fi: 4, rd: 3, sa: 3, size: 'M', owner: 'Group Finance', findings: ['find_003'], ev: ['ev_005'] },
  { n: 5, init: INIT.master, cap: CAP.data, title: 'Single customer master with de-duplication', description: 'Merge the estimated 6,400 duplicate customer records and hold one governed customer record.', rel: 'Internal', status: 'Existing', fi: 5, rd: 4, sa: 5, size: 'L', owner: 'Ines Okafor', findings: ['find_004'], ev: ['ev_004'], rank: 2 },
  { n: 6, init: INIT.master, cap: CAP.data, title: 'Product master governance and attribution', description: 'Define ownership and required attributes for product master data so channels can share one catalogue.', rel: 'Internal', status: 'New', fi: 4, rd: 4, sa: 5, size: 'M', owner: 'Ines Okafor', findings: ['find_004'], ev: ['ev_009', 'ev_014'] },
  { n: 7, init: INIT.master, cap: CAP.procurement, title: 'Supplier master cleanse', description: 'Cleanse and de-duplicate supplier records ahead of procurement automation.', rel: 'B2B', status: 'New', fi: 3, rd: 3, sa: 3, size: 'S', owner: 'Category Management', findings: ['find_011'], ev: ['ev_009'] },
  { n: 8, init: INIT.integration, cap: CAP.platform, title: 'Replace nightly file transfers with event streaming', description: 'Move the fourteen critical overnight transfers onto a monitored event-based integration pattern.', rel: 'Internal', status: 'Existing', fi: 4, rd: 5, sa: 5, size: 'L', owner: 'Priya Ramanathan', findings: ['find_009'], ev: ['ev_013'] },
  { n: 9, init: INIT.integration, cap: CAP.platform, title: 'Retire hand-built EDI scripts', description: 'Replace per-partner EDI scripts with a managed integration pattern and monitoring.', rel: 'B2B', status: 'Updated', fi: 4, rd: 4, sa: 3, size: 'M', owner: 'Priya Ramanathan', findings: ['find_009', 'find_012'], ev: ['ev_013'] },
  { n: 10, init: INIT.integration, cap: CAP.platform, title: 'API gateway and partner onboarding', description: 'Stand up a gateway so new trading partners onboard in days rather than a development cycle.', rel: 'B2B', status: 'New', fi: 4, rd: 3, sa: 5, size: 'M', owner: 'Priya Ramanathan', findings: ['find_009'], ev: ['ev_013', 'ev_014'] },
  { n: 11, init: INIT.cyber, cap: CAP.cyber, title: 'Multi-factor authentication on all remote access', description: 'Close the single-factor privileged access path to warehouse and finance systems.', rel: 'Internal', status: 'Existing', fi: 5, rd: 5, sa: 3, size: 'S', owner: 'Tom Aldridge', findings: ['find_008'], ev: ['ev_010'], rank: 4 },
  { n: 12, init: INIT.cyber, cap: CAP.cyber, title: 'Tested recovery for despatch-critical systems', description: 'Build and test a recovery plan for the warehouse systems that despatch depends on.', rel: 'Internal', status: 'New', fi: 4, rd: 5, sa: 3, size: 'M', owner: 'Tom Aldridge', findings: ['find_008', 'find_010'], ev: ['ev_010'] },
  { n: 13, init: INIT.cyber, cap: CAP.cyber, title: 'Privileged access review and automated offboarding', description: 'Review standing privilege and automate revocation when someone changes role or leaves.', rel: 'Internal', status: 'New', fi: 3, rd: 4, sa: 5, size: 'S', owner: 'Tom Aldridge', findings: ['find_008'], ev: ['ev_010'] },
  { n: 14, init: INIT.cyber, cap: CAP.cyber, title: 'Patch compliance reporting', description: 'Report patch compliance by system owner so exposure is visible between test cycles.', rel: 'Internal', status: 'New', fi: 3, rd: 3, sa: 3, size: 'XS', owner: 'Tom Aldridge', findings: ['find_008'], ev: ['ev_010'] },
  { n: 15, init: INIT.wms, cap: CAP.warehouse, title: 'Directed picking and slotting optimisation', description: 'Enable the licensed directed picking and slotting capability across all three sites.', rel: 'Internal', status: 'Existing', fi: 5, rd: 3, sa: 4, size: 'L', owner: 'Marcus Reed', findings: ['find_005', 'find_010'], ev: ['ev_006'], rank: 5 },
  { n: 16, init: INIT.wms, cap: CAP.warehouse, title: 'Barcode scanning at goods-in', description: 'Extend scanning at goods-in to the third site and remove the paper putaway sheet.', rel: 'Internal', status: 'New', fi: 4, rd: 3, sa: 3, size: 'S', owner: 'DC Operations', findings: ['find_005'], ev: ['ev_006'] },
  { n: 17, init: INIT.wms, cap: CAP.warehouse, title: 'Cycle counting to replace annual stocktake', description: 'Introduce perpetual cycle counting and retire the annual full stocktake shutdown.', rel: 'Internal', status: 'New', fi: 3, rd: 3, sa: 4, size: 'M', owner: 'DC Operations', findings: ['find_006'], ev: ['ev_008'] },
  { n: 18, init: INIT.wms, cap: CAP.warehouse, title: 'Standardise returns processing', description: 'Define one returns route across sites to replace case-by-case handling.', rel: 'B2C', status: 'New', fi: 2, rd: 3, sa: 2, size: 'S', owner: 'DC Operations', findings: ['find_005'], ev: ['ev_006'] },
  { n: 19, init: INIT.apprat, cap: CAP.platform, title: 'Decommission the legacy reporting server', description: 'Retire the end-of-life reporting server once its reports move to the analytics platform.', rel: 'Internal', status: 'New', fi: 3, rd: 2, sa: 2, size: 'S', owner: 'Priya Ramanathan', findings: ['find_012'], ev: ['ev_013'] },
  { n: 20, init: INIT.apprat, cap: CAP.warehouse, title: 'Consolidate duplicate label printing tools', description: 'Standardise on one label printing tool across the three distribution centres.', rel: 'Internal', status: 'New', fi: 2, rd: 2, sa: 3, size: 'XS', owner: 'DC Operations', findings: ['find_012'], ev: ['ev_013'] },
  { n: 21, init: INIT.apprat, cap: CAP.commercial, title: 'Rationalise duplicate CRM licences', description: 'Remove duplicate and dormant CRM seats identified in the licence review.', rel: 'Internal', status: 'New', fi: 4, rd: 2, sa: 2, size: 'XS', owner: 'Callum Barrett', findings: ['find_012'], ev: ['ev_009'] },
  { n: 22, init: INIT.portal, cap: CAP.commercial, title: 'B2B self-serve ordering portal', description: 'Launch trade customer self-serve ordering against the FY29 digital channel objective.', rel: 'B2B', status: 'Existing', fi: 5, rd: 4, sa: 5, size: 'L', owner: 'Sofia Marchetti', findings: ['find_002', 'find_007'], ev: ['ev_014', 'ev_003'], rank: 6 },
  { n: 23, init: INIT.portal, cap: CAP.order_to_cash, title: 'Real-time stock availability for customers', description: 'Expose live availability and lead time to trade customers at the point of ordering.', rel: 'B2B', status: 'New', fi: 4, rd: 4, sa: 4, size: 'M', owner: 'Sofia Marchetti', findings: ['find_002', 'find_006'], ev: ['ev_003', 'ev_008'] },
  { n: 24, init: INIT.portal, cap: CAP.order_to_cash, title: 'Self-serve invoice and statement access', description: 'Let customers retrieve invoices and statements without contacting the branch.', rel: 'B2B', status: 'New', fi: 4, rd: 3, sa: 3, size: 'S', owner: 'Group Finance', findings: ['find_003'], ev: ['ev_005'] },
  { n: 25, init: INIT.portal, cap: CAP.commercial, title: 'Punch-out catalogue for enterprise buyers', description: 'Support punch-out integration so enterprise buyers order from their own procurement system.', rel: 'B2B2C', status: 'New', fi: 3, rd: 3, sa: 3, size: 'M', owner: 'Sofia Marchetti', findings: ['find_002'], ev: ['ev_014'], rank: 8 },
  { n: 26, init: INIT.pricing, cap: CAP.commercial, title: 'Centralised price list management', description: 'Hold all price lists in one governed system with an audited change path.', rel: 'Internal', status: 'Existing', fi: 5, rd: 3, sa: 4, size: 'M', owner: 'Sofia Marchetti', findings: ['find_007'], ev: ['ev_011', 'ev_012'], rank: 7 },
  { n: 27, init: INIT.pricing, cap: CAP.commercial, title: 'Margin-leakage alerting on manual overrides', description: 'Alert on override patterns as they happen rather than in a spreadsheet six weeks later.', rel: 'Internal', status: 'New', fi: 4, rd: 3, sa: 5, size: 'S', owner: 'Group Finance', findings: ['find_007'], ev: ['ev_011', 'ev_012'] },
  { n: 28, init: INIT.pricing, cap: CAP.commercial, title: 'Automate volume rebate calculation', description: 'Replace the spreadsheet rebate calculation with a rules-based accrual in the ERP.', rel: 'B2B', status: 'New', fi: 4, rd: 2, sa: 3, size: 'M', owner: 'Group Finance', findings: ['find_007'], ev: ['ev_012'] },
  { n: 29, init: INIT.fieldsales, cap: CAP.commercial, title: 'Mobile order capture for field representatives', description: 'Capture orders on the device at the customer rather than re-keying them at the branch.', rel: 'B2B', status: 'New', fi: 3, rd: 3, sa: 3, size: 'S', owner: 'Callum Barrett', findings: ['find_002'], ev: ['ev_002'] },
  { n: 30, init: INIT.fieldsales, cap: CAP.commercial, title: 'Territory and call-plan reporting', description: 'Report coverage and call plan adherence by territory for the field sales team.', rel: 'Internal', status: 'New', fi: 2, rd: 2, sa: 2, size: 'XS', owner: 'Callum Barrett', findings: ['find_012'], ev: ['ev_009'] },
  { n: 31, init: INIT.forecast, cap: CAP.inventory, title: 'Statistical demand forecast to replace the spreadsheet', description: 'Introduce a statistical demand forecast with versioning, accuracy measurement and an owner.', rel: 'Internal', status: 'Existing', fi: 5, rd: 3, sa: 5, size: 'L', owner: 'Ines Okafor', findings: ['find_006'], ev: ['ev_007', 'ev_008'] },
  { n: 32, init: INIT.forecast, cap: CAP.inventory, title: 'Automated replenishment proposals', description: 'Generate replenishment proposals from the forecast instead of static annual reorder points.', rel: 'Internal', status: 'New', fi: 4, rd: 3, sa: 4, size: 'M', owner: 'Ines Okafor', findings: ['find_006'], ev: ['ev_008'] },
  { n: 33, init: INIT.forecast, cap: CAP.procurement, title: 'Supplier lead-time variability model', description: 'Model supplier lead-time variability so safety stock reflects actual reliability.', rel: 'B2B', status: 'New', fi: 3, rd: 2, sa: 4, size: 'S', owner: 'Category Management', findings: ['find_006', 'find_011'], ev: ['ev_007'] },
  { n: 34, init: INIT.analytics, cap: CAP.data, title: 'Governed KPI layer for board reporting', description: 'Certify one set of KPI definitions and serve the board pack and operational reporting from it.', rel: 'Internal', status: 'New', fi: 4, rd: 3, sa: 5, size: 'M', owner: 'Ines Okafor', findings: ['find_003', 'find_004'], ev: ['ev_005', 'ev_009'] },
  { n: 35, init: INIT.automation, cap: CAP.warehouse, title: 'Goods-to-person pilot in the main DC', description: 'Pilot goods-to-person automation on the highest-velocity zone of the main distribution centre.', rel: 'Internal', status: 'New', fi: 4, rd: 2, sa: 4, size: 'XL', owner: 'Marcus Reed', findings: ['find_005'], ev: ['ev_006', 'ev_007'] },
  { n: 36, init: INIT.automation, cap: CAP.warehouse, title: 'Automated dimensioning and cubing', description: 'Capture dimensions automatically at goods-in to improve load planning and carrier costs.', rel: 'Internal', status: 'New', fi: 3, rd: 2, sa: 2, size: 'M', owner: 'DC Operations', findings: ['find_005'], ev: ['ev_006'] },
];

const code = (n: number): string => `OPP-${String(n).padStart(3, '0')}`;
const oppId = (n: number): string => `opp_${String(n).padStart(3, '0')}`;

function opportunities(): Opportunity[] {
  return OPP_SEEDS.map((s) => ({
    id: oppId(s.n),
    engagementId: ENGAGEMENT_ID,
    initiativeId: s.init,
    displayCode: code(s.n),
    title: s.title,
    description: s.description,
    capabilityAreaId: s.cap,
    relationshipType: s.rel,
    status: s.status,
    linkedFindingIds: s.findings,
    clientRank: s.rank ?? null,
    tShirtSize: s.size,
    owner: s.owner,
  }));
}

const FI_LABEL: Record<AnchorScore, string> = {
  5: 'Transformational',
  4: 'Material',
  3: 'Moderate',
  2: 'Indirect',
  1: 'Hygiene',
};
const RD_LABEL: Record<AnchorScore, string> = {
  5: 'Existential',
  4: 'Severe',
  3: 'Compounding',
  2: 'Latent',
  1: 'Negligible',
};
const SA_LABEL: Record<AnchorScore, string> = {
  5: 'Named explicitly',
  4: 'Direct enabler',
  3: 'Foundational dependency',
  2: 'Thematic fit',
  1: 'Not traceable',
};

const FI_REASON: Record<AnchorScore, string> = {
  5: 'moves a headline P&L line on its own',
  4: 'carries a quantified benefit case inside the plan horizon',
  3: 'carries a credible six-figure benefit, sized but not yet underwritten',
  2: 'delivers its benefit through another initiative rather than directly',
  1: 'carries no attributable financial benefit',
};
const RD_REASON: Record<AnchorScore, string> = {
  5: 'deferral puts trading capability or regulatory standing at risk',
  4: 'deferral risks a major service or control failure within the year',
  3: 'cost and complexity grow each quarter this waits',
  2: 'the weakness is contained by workarounds with no near-term trigger',
  1: 'deferral changes nothing material for at least two years',
};
const SA_REASON: Record<AnchorScore, string> = {
  5: 'named in the FY27-FY29 board strategy paper',
  4: 'directly delivers a named strategic objective',
  3: 'a stated objective cannot be reached without it',
  2: 'consistent with the direction but not required by an objective',
  1: 'no line of sight to a stated objective',
};

function scoreRationale(s: OppSeed): Record<DimensionKey, string> {
  return {
    financial_impact: `${FI_LABEL[s.fi]} (${s.fi}) — ${FI_REASON[s.fi]}.`,
    risk_if_deferred: `${RD_LABEL[s.rd]} (${s.rd}) — ${RD_REASON[s.rd]}.`,
    strategic_alignment: `${SA_LABEL[s.sa]} (${s.sa}) — ${SA_REASON[s.sa]}.`,
  };
}

function opportunityScores(): OpportunityScore[] {
  return OPP_SEEDS.map((s) => ({
    id: `oscore_${String(s.n).padStart(3, '0')}`,
    opportunityId: oppId(s.n),
    scoringModelId: MODEL_ID,
    financialImpact: s.fi,
    riskIfDeferred: s.rd,
    strategicAlignment: s.sa,
    rationale: scoreRationale(s),
    evidenceIds: {
      financial_impact: s.ev.slice(0, 1),
      risk_if_deferred: s.ev.slice(0, 2),
      strategic_alignment: s.ev.slice(-1),
    },
    scoredBy: s.n % 3 === 0 ? 'Ashmi Chandra' : 'Liv DeSantis',
    scoredAt: '2026-07-14T11:00:00.000Z',
  }));
}

/* ---------------------------------------------------------- dependencies */

function dependencies(): Dependency[] {
  const rows: [string, string, string, Dependency['type'], Dependency['strength'], Dependency['source'], string][] =
    [
      ['dep_001', INIT.erp, INIT.integration, 'finish_to_start', 'hard', 'architecture', 'The integration layer targets the upgraded ERP interfaces; building against the unsupported release would be rework.'],
      // Deliberately violated by the current plan: both sit in Wave 2, so the feasibility
      // check has a real dependency violation to report and the demo can show it being fixed.
      ['dep_002', INIT.integration, INIT.portal, 'finish_to_start', 'hard', 'workshop', 'The portal needs live availability and pricing through the new integration layer before it can transact.'],
      ['dep_003', INIT.master, INIT.forecast, 'enables', 'hard', 'workshop', 'Forecasting on unresolved product and customer duplicates would produce unusable output.'],
      ['dep_004', INIT.master, INIT.analytics, 'enables', 'hard', 'architecture', 'A certified KPI layer requires governed master data underneath it.'],
      ['dep_005', INIT.cyber, INIT.portal, 'enables', 'soft', 'workshop', 'Exposing an external channel before the identity uplift widens the attack surface.'],
      ['dep_006', INIT.wms, INIT.automation, 'finish_to_start', 'hard', 'architecture', 'Automation needs directed picking and accurate stock in place before it can be piloted.'],
      ['dep_007', INIT.portal, INIT.pricing, 'start_to_start', 'soft', 'ai_inferred', 'Portal pricing and centralised price management should be designed together to avoid two rule sets.'],
      ['dep_008', INIT.erp, INIT.wms, 'shares_resource', 'soft', 'workshop', 'Both depend on the same four-person integration team, which caps parallel delivery.'],
      ['dep_009', INIT.integration, INIT.apprat, 'shares_resource', 'soft', 'architecture', 'Decommissioning cannot proceed faster than the integration team can re-point interfaces.'],
      ['dep_010', INIT.analytics, INIT.pricing, 'enables', 'soft', 'ai_inferred', 'Margin alerting is stronger on the analytics platform, but pricing can ship its own reporting first.'],
    ];
  return rows.map(([id, from, to, type, strength, source, rationale]) => ({
    id,
    engagementId: ENGAGEMENT_ID,
    fromInitiativeId: from,
    toInitiativeId: to,
    type,
    strength,
    source,
    rationale,
  }));
}

/* -------------------------------------------------------------- decisions */

function decisions(): Decision[] {
  return [
    {
      id: 'dec_001',
      engagementId: ENGAGEMENT_ID,
      title: 'Upgrade the ERP rather than replace it',
      question: 'Should Northwind upgrade the incumbent ERP or run a full replacement selection?',
      optionsConsidered: [
        'Upgrade to the current supported release',
        'Full ERP replacement with a market selection',
        'Extend third-party support and defer the decision',
      ],
      decision: 'Upgrade to the current supported release, retiring bespoke modifications where standard capability now exists.',
      rationale:
        'A replacement consumes the entire investment envelope for three years and blocks the digital channel objective. The upgrade restores support within Wave 1 and preserves optionality on a later replacement.',
      decidedBy: 'Dana Whitfield',
      decidedAt: '2026-07-02T10:00:00.000Z',
      affectedIds: [INIT.erp, 'opp_001', 'opp_003'],
    },
    {
      id: 'dec_002',
      engagementId: ENGAGEMENT_ID,
      title: 'Fix master data before building analytics',
      question: 'Can the analytics platform proceed in parallel with master data remediation?',
      optionsConsidered: [
        'Run both in parallel to shorten the plan',
        'Sequence master data first as a hard prerequisite',
      ],
      decision: 'Master data is a hard prerequisite for both forecasting and the analytics platform.',
      rationale:
        'Two abandoned FY25 proofs of concept failed on data quality, not modelling. Repeating that pattern would spend the credibility the programme needs.',
      decidedBy: 'Liv DeSantis',
      decidedAt: '2026-07-09T14:00:00.000Z',
      affectedIds: [INIT.master, INIT.forecast, INIT.analytics, 'dep_003', 'dep_004'],
    },
    {
      id: 'dec_003',
      engagementId: ENGAGEMENT_ID,
      title: 'Use licensed WMS capability before evaluating automation',
      question: 'Should the automation pilot start in Wave 2 alongside WMS optimisation?',
      optionsConsidered: [
        'Start the automation pilot in Wave 2',
        'Turn on licensed WMS capability first, then pilot automation',
      ],
      decision: 'Turn on the licensed directed picking and slotting capability first; hold the automation pilot until that baseline exists.',
      rationale:
        'An automation business case measured against an unoptimised baseline would overstate the benefit and could commit capital to the wrong network design.',
      decidedBy: 'Marcus Reed',
      decidedAt: '2026-07-16T09:30:00.000Z',
      affectedIds: [INIT.wms, INIT.automation, 'dep_006'],
    },
    {
      id: 'dec_004',
      engagementId: ENGAGEMENT_ID,
      title: 'Adopt CMMI as the maturity framework',
      question: 'Which maturity framework should the current-state assessment use?',
      optionsConsidered: [
        'CMMI five-level capability maturity',
        'A four-level digital maturity ladder',
      ],
      decision: 'CMMI five levels, applied per focus area with an explicit "insufficient evidence" state.',
      rationale:
        'CMMI is already familiar to Northwind internal audit, and five levels leave room to show progress between waves. The insufficient-evidence state keeps unrated areas honest rather than defaulting them to level one.',
      decidedBy: 'Liv DeSantis',
      decidedAt: '2026-06-10T11:00:00.000Z',
      affectedIds: ['mfa_015', 'mfa_028'],
    },
  ];
}

/* --------------------------------------------------------- AI suggestions */

function aiSuggestions(): AISuggestion[] {
  return [
    {
      id: 'ai_001',
      engagementId: ENGAGEMENT_ID,
      capability: 'maturity_level_proposal',
      capabilityLabel: 'Maturity level proposal',
      targetType: 'maturity_focus_area',
      targetId: 'mfa_015',
      payload: {
        currentLevel: 2,
        targetLevel: 3,
        rationale:
          'Supplier scorecards exist in the category management pack but are not used to manage performance, which matches Managed rather than Defined.',
      },
      confidence: 0.52,
      confidenceBand: 'low',
      evidenceIds: ['ev_009'],
      rationale:
        'Inferred from the category management process description; no supplier performance data was in the fact base, so this is a proposal to test, not a rating.',
      status: 'proposed',
      reviewedBy: null,
      reviewedAt: null,
      modelVersion: 'mock-v1',
      createdAt: '2026-08-04T09:00:00.000Z',
    },
    {
      id: 'ai_002',
      engagementId: ENGAGEMENT_ID,
      capability: 'opportunity_score_proposal',
      capabilityLabel: 'Opportunity score proposal',
      targetType: 'opportunity',
      targetId: 'opp_017',
      payload: {
        financialImpact: 4,
        riskIfDeferred: 3,
        strategicAlignment: 4,
        rationale: {
          financial_impact:
            'Material (4) — removing the annual stocktake shutdown recovers two trading days plus the write-off variance quantified in the inventory report.',
          risk_if_deferred:
            'Compounding (3) — stock accuracy degrades further as volumes grow, and the portal depends on accurate availability.',
          strategic_alignment:
            'Direct enabler (4) — accurate stock is a precondition of the digital availability commitment.',
        },
      },
      confidence: 0.78,
      confidenceBand: 'high',
      evidenceIds: ['ev_008', 'ev_014'],
      rationale:
        'The current financial impact of 3 does not account for the two trading days lost to the annual stocktake, which the inventory position report quantifies.',
      status: 'proposed',
      reviewedBy: null,
      reviewedAt: null,
      modelVersion: 'mock-v1',
      createdAt: '2026-08-04T09:05:00.000Z',
    },
    {
      id: 'ai_003',
      engagementId: ENGAGEMENT_ID,
      capability: 'opportunity_score_proposal',
      capabilityLabel: 'Opportunity score proposal',
      targetType: 'opportunity',
      targetId: 'opp_028',
      payload: {
        financialImpact: 3,
        riskIfDeferred: 2,
        strategicAlignment: 3,
        rationale: {
          financial_impact:
            'Moderate (3) — rebate accrual errors are real but the sized benefit sits below the million-pound threshold for Material.',
          risk_if_deferred: 'Latent (2) — the spreadsheet works and is reconciled quarterly.',
          strategic_alignment:
            'Foundational dependency (3) — supports margin discipline without being named in the strategy.',
        },
      },
      confidence: 0.61,
      confidenceBand: 'medium',
      evidenceIds: ['ev_012'],
      rationale:
        'Financial impact of 4 appears to double-count the margin leakage already attributed to override alerting in OPP-027.',
      status: 'proposed',
      reviewedBy: null,
      reviewedAt: null,
      modelVersion: 'mock-v1',
      createdAt: '2026-08-04T09:07:00.000Z',
    },
    {
      id: 'ai_004',
      engagementId: ENGAGEMENT_ID,
      capability: 'dependency_inference',
      capabilityLabel: 'Dependency inference',
      targetType: 'initiative',
      targetId: INIT.fieldsales,
      payload: {
        fromInitiativeId: INIT.master,
        toInitiativeId: INIT.fieldsales,
        type: 'enables',
        strength: 'soft',
        rationale:
          'Mobile order capture surfaces the customer master directly to representatives, so duplicate records become visible to the customer.',
      },
      confidence: 0.66,
      confidenceBand: 'medium',
      evidenceIds: ['ev_004', 'ev_002'],
      rationale:
        'Both initiatives read the customer master; the duplicate rate in the fact base suggests field sales would expose it if launched first.',
      status: 'proposed',
      reviewedBy: null,
      reviewedAt: null,
      modelVersion: 'mock-v1',
      createdAt: '2026-08-04T09:10:00.000Z',
    },
    {
      id: 'ai_005',
      engagementId: ENGAGEMENT_ID,
      capability: 'duplicate_merge_proposal',
      capabilityLabel: 'Duplicate opportunity merge',
      targetType: 'opportunity',
      targetId: 'opp_020',
      payload: {
        keepOpportunityId: 'opp_020',
        mergeOpportunityId: 'opp_036',
        mergedTitle: 'Standardise label printing, dimensioning and cubing at goods-in',
        mergedDescription:
          'Consolidate label printing onto one tool and capture dimensions automatically at goods-in, delivered as a single goods-in equipment change across the three distribution centres.',
      },
      confidence: 0.44,
      confidenceBand: 'low',
      evidenceIds: ['ev_006'],
      rationale:
        'Both opportunities change the same goods-in workstation and cite the same evidence, so they may be one piece of work. Low confidence: they sit under different initiatives and may be funded separately.',
      status: 'proposed',
      reviewedBy: null,
      reviewedAt: null,
      modelVersion: 'mock-v1',
      createdAt: '2026-08-04T09:14:00.000Z',
    },
    {
      id: 'ai_006',
      engagementId: ENGAGEMENT_ID,
      capability: 'board_headline_draft',
      capabilityLabel: 'Board headline draft',
      targetType: 'engagement',
      targetId: ENGAGEMENT_ID,
      payload: {
        headline:
          'Stabilise an unsupported core in 2027, then earn the growth: half of order value digital by FY29.',
        supportingLine:
          'Six critical opportunities carry the plan. Two of them — the ERP upgrade and the customer master — gate everything that follows, and neither has a named owner beyond IT today.',
      },
      confidence: 0.71,
      confidenceBand: 'high',
      evidenceIds: ['ev_001', 'ev_014', 'ev_004'],
      rationale:
        'Drafted from the four themes, the critical band membership and the FY29 objective named in the board strategy paper.',
      status: 'proposed',
      reviewedBy: null,
      reviewedAt: null,
      modelVersion: 'mock-v1',
      createdAt: '2026-08-04T09:20:00.000Z',
    },
  ];
}

/* ------------------------------------------------- version 1 publication */

/**
 * Version 1 deliberately excludes the roadmap and the initiatives. The client has seen the
 * current state, the maturity picture and the scored opportunity register, but not the
 * sequencing — so the demo's publish step visibly adds new content to the portal.
 */
const V1_SELECTION: PublishSelection = {
  includeCurrentState: true,
  includeMaturityHeatmap: true,
  includeOpportunities: true,
  includeInitiatives: false,
  includeRoadmap: false,
  includeDecisions: true,
  includeScores: true,
  allowComments: true,
  allowRanking: true,
  allowDependencySuggestions: false,
  allowTimingFeedback: false,
};

function clientSubmissions(): ClientSubmission[] {
  return [
    {
      id: 'sub_001',
      engagementId: ENGAGEMENT_ID,
      snapshotVersion: 1,
      kind: 'comment',
      targetType: 'opportunity',
      targetId: 'opp_022',
      body:
        'The portal is the right priority, but the FY29 target assumes our top 40 customers will move. Two of them have their own procurement platforms and will need punch-out, not a portal login. Can the register make that dependency explicit?',
      payload: null,
      submittedBy: 'user_dana',
      submittedByName: 'Dana Whitfield',
      submittedAt: '2026-08-07T16:20:00.000Z',
      status: 'pending',
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      appliedChange: null,
    },
  ];
}

/* ------------------------------------------------------------ audit trail */

function auditEvents(): Database['auditEvents'] {
  return [
    {
      id: 'audit_001',
      engagementId: ENGAGEMENT_ID,
      actorId: 'user_liv',
      actorName: 'Liv DeSantis',
      action: 'engagement.created',
      targetType: 'engagement',
      targetId: ENGAGEMENT_ID,
      detail: 'Engagement opened and charter agreed with the executive sponsor.',
      at: '2026-05-18T08:00:00.000Z',
    },
    {
      id: 'audit_002',
      engagementId: ENGAGEMENT_ID,
      actorId: 'user_ashmi',
      actorName: 'Ashmi Chandra',
      action: 'opportunity.scored',
      targetType: 'engagement',
      targetId: ENGAGEMENT_ID,
      detail: 'Scored 36 opportunities against Aberdeen Opportunity Prioritisation v1.',
      at: '2026-07-14T11:00:00.000Z',
    },
    {
      id: 'audit_003',
      engagementId: ENGAGEMENT_ID,
      actorId: 'user_liv',
      actorName: 'Liv DeSantis',
      action: 'snapshot.published',
      targetType: 'snapshot',
      targetId: `snap_${ENGAGEMENT_ID}_v1`,
      detail: 'Published version 1 to the client portal: current state, maturity, register and decisions.',
      at: '2026-08-05T10:00:00.000Z',
    },
  ];
}

/* ------------------------------------------------------------------ build */

export function buildSeed(): Database {
  const db: Database = {
    users: users(),
    engagements: [engagement()],
    scoringModels: [scoringModel()],
    capabilityAreas: capabilityAreas(),
    maturityFocusAreas: maturityFocusAreas(),
    evidence: evidence(),
    findings: findings(),
    themes: themes(),
    initiatives: initiatives(),
    opportunities: opportunities(),
    opportunityScores: opportunityScores(),
    dependencies: dependencies(),
    waves: waves(),
    decisions: decisions(),
    aiSuggestions: aiSuggestions(),
    publishedSnapshots: [],
    clientSubmissions: clientSubmissions(),
    auditEvents: auditEvents(),
  };

  db.publishedSnapshots.push(
    buildSnapshot({
      db,
      engagementId: ENGAGEMENT_ID,
      selection: V1_SELECTION,
      version: 1,
      publishedBy: 'Liv DeSantis',
      note: 'Current state, maturity assessment and the scored opportunity register for review ahead of the sequencing workshop.',
      publishedAt: '2026-08-05T10:00:00.000Z',
      id: `snap_${ENGAGEMENT_ID}_v1`,
    }),
  );

  return db;
}

export const SEED_ENGAGEMENT_ID = ENGAGEMENT_ID;
export const SEED_MODEL_ID = MODEL_ID;
export const SEED_TIMESTAMP = NOW;
