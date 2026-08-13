# Conductor

**One versioned model for an Aberdeen Advisors transformation-roadmap engagement, with the
client-facing deliverable read out of that model instead of retyped into a deck.**

Conductor is for Aberdeen engagement teams and the client executives they report to. It sits in the
place a twelve-week transformation-roadmap engagement currently runs on two Excel workbooks and four
PowerPoint decks: evidence and findings, a maturity assessment, a scored opportunity register,
initiatives grouped into themes, and waves sequenced against typed dependencies all live in one
model, and every derived number is computed by one calculation engine rather than typed into a cell.
Two authenticated experiences read that model — an Aberdeen internal workspace where consultants do
the analysis, and a client portal that shows only what Aberdeen has explicitly published. Client
input comes back as proposed changes a consultant accepts or rejects, so the client can influence
the plan without overwriting the internal source of truth.

## The problem

Drawn from the reference engagement documented in `docs/PRD.md` (§1.2, §1.3, §2.4):

1. **Scores are stored as prose and parsed back out of display strings.** The visible cell holds a
   full anchor sentence and the number is recovered with `=VALUE(LEFT(H7,1))` in a hidden column, so
   the arithmetic depends on which character happens to sit in position 1 of a free-text cell.
2. **The weights are hard-coded into a formula row, twice.** The triple 0.40 / 0.35 / 0.25 appears
   in row 4 and again in row 5; only row 5 is read, by `=SUMPRODUCT($I$5:$M$5,I7:M7)`, which spans
   two prose cells and works only because Excel coerces text to zero.
3. **The taxonomy is typed, not enforced.** An 18-row initiative picker backs 17 real initiatives
   because one name is duplicated unmerged, and the same theme exists under more than one unmerged
   name across the two workbooks and the recap email, so no roll-up by theme can be trusted.
4. **One quadrant of the priority chart can never be populated.** "Defend" requires business value
   below 3.5 and urgency at or above 3.5, which the axis definitions almost never produce; across 43
   scored rows it never occurred, yet the label is printed on a client-facing 2x2 and hand-typed once
   in a copy sheet.
5. **The deck then drifts from the workbook.** The deck states roughly fifty opportunities with
   per-theme counts summing to 56, against 43 + 12 rows and 17 initiatives in the workbooks, and its
   only staleness signal is a hand-typed "First draft" footer.

The consequence is the one that matters: the deliverable and the model diverge, and nobody can tell
which is right.

## Demo credentials

Seeded in `lib/demo-users.ts` and `lib/seed.ts`, shown on the landing page and available as
quick-fill buttons on `/login`. All four users are attached to the same seeded engagement.

| Email | Password | Role | Name and title |
| --- | --- | --- | --- |
| `liv@aberdeenadvisors.com` | `conductor2026` | `aberdeen` | Liv DeSantis, Engagement Lead |
| `ashmi@aberdeenadvisors.com` | `conductor2026` | `aberdeen` | Ashmi Chandra, Analyst |
| `cio@northwind-distribution.com` | `client2026` | `client` | Dana Whitfield, Chief Information Officer |
| `coo@northwind-distribution.com` | `client2026` | `client` | Marcus Reed, Chief Operating Officer |

The seeded engagement is **Northwind Distribution — Technology & Operations Transformation
Roadmap**, a fictional mid-market wholesale distributor. Every figure in it is invented.

## The demo path

Ten steps, about ten minutes. `POST /api/dev/reset` restores the seed at any point so the demo can
be re-run from the top; it needs no authentication and returns the record counts it restored.

1. **Sign in as Aberdeen.** Open `http://localhost:3000`, follow *Sign in to aberdeen workspace*,
   and use the quick-fill button for Liv DeSantis on the **Sign in** screen (`/login`).
2. **Open the seeded engagement.** You land on **Workspace › Overview** (`/workspace`): Northwind
   Distribution, phase 4 of 8, 36 of 36 opportunities scored, 6 in the Critical band, 3 feasibility
   issues, and a quadrant table that reports `Defend: 0` together with the reason the framework
   cannot fill it.
3. **Change scores and watch the derived values move.** **Workspace › Opportunities**
   (`/workspace/opportunities`) shows the three stored integers (FI / RD / SA) beside the weighted
   score, band and quadrant that are recomputed from them, with filters for theme, capability area
   and priority band above the register. Follow the OPP-017 row into its scoring view
   (`/workspace/opportunities/opp_017`), which prints the full anchor rubric — every 1–5 anchor with
   its definition, the current score marked on each dimension, and a rationale box beside it. Set
   Financial Impact to 5, Risk if Deferred to 4 and Strategic Alignment to 4, write a line of
   rationale for each, and save.

   OPP-017 moves from 3.25 / Medium Priority / Plan & Fund to 4.40 / High Priority / Act Now — the
   panel on that screen reports the weighted score, the priority band, both axes and the quadrant —
   and the theme roll-up and band counts on **Overview** move with it. Nothing derived was written:
   only the three integers changed, and `PUT …/opportunities/{id}/score` behind the form takes
   nothing else.
4. **Move an initiative between waves.** **Workspace › Roadmap** (`/workspace/roadmap`) reports a
   real dependency violation: *B2B Customer Portal* sits in Wave 2 but depends, hard
   finish-to-start, on *Integration Layer Replatform*, which is also in Wave 2. The sequencing table
   carries a wave selector for every initiative with its computed earliest possible wave beside it,
   so move *B2B Customer Portal* to Wave 3 — the wave its hard dependencies actually allow.

   The feasibility list re-renders on the same screen: the violation clears, the portal card moves to
   Wave 3, and the two remaining issues (an unsequenced *Warehouse Automation Pilot*, and *Master
   Data Foundation* blocking two initiatives with no named owner) stay put with their minimum fixes.
   The same screen carries a dependency form (from, to, type, strength, rationale) and a remove
   control on every dependency row; the server refuses a dependency that would close a cycle and the
   refusal is surfaced as a message rather than swallowed.
5. **Publish selected sections to the client.** **Workspace › Publish** (`/workspace/publish`).
   Version 1 deliberately excluded the initiatives and the roadmap, so tick *Initiatives* and
   *Roadmap*, leave the four client permissions on, write a note, and press **Publish version 2**.
   Publishing freezes a deep copy of exactly what is ticked plus the derived values as they stand.
   *Preview the portal* opens `/portal?preview=1` with an Aberdeen preview banner.
6. **Sign in as the client.** Sign out, then sign in as Dana Whitfield. You land on **Portal ›
   Overview** (`/portal`), which reads version 2 of the snapshot and nothing else: themes and their
   shares, the highest-priority opportunities with the frozen scores, and any ranking her team has
   already given.
7. **Read the published roadmap.** **Portal › Roadmap** (`/portal/roadmap`) shows the four waves
   with the dependencies that drive the order and the reason recorded for each, and a theme filter
   that narrows the sequence to one theme — the filter lives in the query string, so a filtered
   roadmap is a URL an executive can send on. **Portal › Initiatives** (`/portal/initiatives`) groups
   the same initiatives under their themes with the rollup band, and **Portal › Decisions**
   (`/portal/decisions`) carries the four decisions with the options considered. Both roadmap and
   initiatives appear here for the first time because of step 5 — before it, these screens explained
   that sequencing had not been published yet.
8. **Submit a comment and a ranking.** **Portal › My Feedback** (`/portal/feedback`). Comment on an
   opportunity, then rank one at position 1. Both are recorded as `pending` against snapshot version
   2 and listed underneath with their status. What a client may do is governed by the snapshot they
   are answering, so the forms shown here follow the permissions ticked at publish time: the
   dependency-suggestion form appears only because *Dependency suggestions* was left ticked at
   publish time, and a snapshot published without that flag does not render the form at all.
9. **Return to the Aberdeen queue and decide.** Sign back in as Liv and open **Workspace › Client
   Feedback** (`/workspace/client-feedback`). Accept the ranking — the queue reports exactly what it
   changed (`Set client rank 1 on OPP-0nn (was unranked)`) and writes an audit event — and reject the
   comment with a review note, which changes nothing in the model. The seeded pending comment from
   Dana is a third item to practise on. **Workspace › AI Review** (`/workspace/ai-review`) is the
   same mechanic over six proposed AI suggestions, each with its confidence, evidence and
   `mock-v1` model version.
10. **Republish.** Back on **Workspace › Publish**, publish version 3. The version history lists all
    three, the client's *My Feedback* screen shows the accepted item and the change it caused, and
    the accepted rank now appears in the portal — which is the whole loop: publish, respond, review,
    republish, with the internal model never written to by the client directly.

## Local setup

Node 20 or newer (verified on Node 22.22.2 and npm 10.9.7). No database, no environment file, no
external services.

```bash
git clone https://github.com/Aberdeen-Advisors/hack-team-06
cd hack-team-06
npm install          # 55 packages; 3 runtime deps (next, react, react-dom)
npm run dev          # http://localhost:3000
```

On first run the store creates `.data/conductor-db.json` and loads the seed, and the workspace
sidebar reports `Storage: file-backed`. Sign in from the landing page; the credentials above are
printed on it. Edits persist across restarts locally, and `POST /api/dev/reset` puts the seed back.

Verify the calculation engine and the production build:

```bash
npm run check:calc   # 22 assertions over lib/calc.ts and the seed; non-zero exit on failure
npm run build        # production build with full type checking
```

`npm run check:calc` in this clone printed `22 passed, 0 failed`, covering every band boundary
(4.5 / 3.75 / 2.8), the 3.5 quadrant threshold on both axes, a weight set that does not sum to 1.0,
unassessed maturity areas excluded from means, dependency cycle detection, the seeded feasibility
violations, and the shape of the version 1 snapshot. `npm run build` compiled clean with no type
errors, reporting 37 route entries.

And run the whole demo path unattended, through a real browser:

```bash
npm run dev &                                                    # or any running instance
python3 scripts/e2e-happy-path.py --base-url http://localhost:3000
```

`scripts/e2e-happy-path.py` drives all ten steps above through the UI with Playwright — signing in
as both roles, rescoring through the scoring view, moving the wave, adding and removing a dependency,
publishing, submitting client feedback, accepting one item and rejecting another, republishing — and
asserts the role boundaries in the browser and again at the API level. It POSTs `/api/dev/reset`
first, so it is repeatable from the seed (`--no-reset` skips that); it takes `--base-url` (default
`http://localhost:3111`) and `--headed`; and it needs `playwright` pinned to `1.56.0`. The run in
this clone printed `113 passed, 0 failed`.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_DIR` | `.data` | Directory the JSON document store writes to |
| `SESSION_SECRET` | `atlas-dev-secret` | HMAC key for the session cookie |

## Architecture notes

**Stack.** Next.js 15.5.4 on the App Router with React 19.1.1, TypeScript 5.7 in strict mode, and
Tailwind CSS v4 through `@tailwindcss/postcss`. Server components read the model directly, and
interactivity is confined to a handful of client components — login, publish, the scoring form, the
roadmap wave selector and dependency controls, the two review queues, the client feedback form, the
query-string filter bars, sign out, plus navigation and toasts. Filtering is done on the server from
the query string, so a filtered view is a shareable URL rather than hidden rows, and `app/error.tsx`
and `app/not-found.tsx` catch the rest so no page can show a stack trace. `tsx` runs the calculation
checks. There is no ORM, no auth library, no state library and no component library.

**Storage, and its honest limitation.** `lib/store.ts` is a single JSON document store: the whole
database is one object held on a `globalThis` key, read synchronously from memory, mutated through
`mutate()` (which appends audit events) and written to `process.env.DATA_DIR ?? '.data'` on a 250 ms
debounce, falling back to `/tmp/atlas-data` and finally to memory only. The persisted file is
fingerprinted against the seed shape, so a stale file is discarded rather than merged. Locally your
edits survive a restart. On a serverless host the filesystem is ephemeral and per-instance: an edit
survives inside the instance that handled it, but a cold start — or a request routed elsewhere —
reloads the seed and the edit is gone. There is no shared database. The active mode is reported in
the workspace sidebar and by `/api/dev/reset`.

**Auth, and its honest limitation.** `lib/auth.ts` compares a plaintext password from the seed and
sets one cookie, `conductor_session`, holding a base64url payload of `{userId, role}` with an
HMAC-SHA256 signature (`httpOnly`, `sameSite=lax`, 12-hour max age). The cookie is tamper-evident,
not encrypted; the seeded record is treated as authoritative for role, not the cookie's claim. There
is no registration, password reset, lockout or rate limiting. This is a demo choice made so a
reviewer can sign in as four people in five minutes. It is not production authentication and must not
be reused as such.

**Role enforcement is doubled.** `middleware.ts` runs in the Edge runtime, verifies the cookie with
Web Crypto and only redirects: unauthenticated traffic to `/login?next=…`, a client user away from
`/workspace`, and an Aberdeen user viewing `/portal` into an explicit `?preview=1` mode with a
banner. Enforcement proper happens server-side in every API route and every page, through
`requireRole` / `aberdeenOnly` / `clientOnly` / `anyRole` in `lib/auth.ts` and `lib/api.ts`. A client
posting to the publish endpoint gets a 403 from the route handler, not from middleware. There is also
no route that hands a client user live working data: portal pages and `GET /published` read only the
latest `PublishedSnapshot`.

**The one architectural rule worth naming: AI proposes, deterministic code calculates.** Every AI
output is an `AISuggestion` carrying a capability, a target, a payload, a confidence score and band,
cited evidence ids, a rationale and a model version, in status `proposed`. A consultant accepts,
accepts-with-edits or rejects it; accepting applies the payload to the working model and writes an
audit event, rejecting changes nothing but the suggestion's own status. No AI output can write a
calculated field, because calculated fields are not stored at all — `OpportunityScore` holds three
integers and everything else is recomputed on read from `lib/calc.ts`. Off-by-one-column drift is
structurally unrepresentable.

**The calculation surface** is the exported functions of `lib/calc.ts`, which is pure and does no
I/O: `assertWeightsValid`, `weightedScore`, `priorityBand`, `businessValueAxis`, `urgencyAxis`,
`quadrant`, `deriveOpportunity`, `maturityGap`, `capabilityAreaMaturity`, `initiativeRollup`,
`themePortfolio`, `earliestStart`, `detectCycles`, `feasibilityIssues`, `quadrantPopulation`. If a
number appears in the UI and a consultant did not type it, it came from one of those.

## The analytical method

- **Three scored dimensions, weighted.** Financial Impact 0.40, Risk if Deferred 0.35, Strategic
  Alignment 0.25. Each is an integer 1–5 chosen against a labelled anchor rubric — Financial Impact
  runs Transformational / Material / Moderate / Indirect / Hygiene, Risk if Deferred runs Existential
  / Severe / Compounding / Latent / Negligible, Strategic Alignment runs Named explicitly / Direct
  enabler / Foundational dependency / Thematic fit / Not traceable — and every score carries a
  per-dimension rationale and cited evidence. `weightedScore` throws if a model's weights do not sum
  to 1.0.
- **Priority bands** are inclusive lower bounds at 4.5 Critical, 3.75 High Priority, 2.8 Medium
  Priority, and 0 Lower Priority. The seeded register populates all four (6 / 12 / 13 / 5).
- **The 2x2.** Business value is `(strategic alignment + financial impact) / 2`; urgency is the risk
  score raw; both axes split at 3.5, inclusive. The seed lands 12 Act Now, 14 Plan & Fund, 10
  Sequence Later, 0 Defend — and `quadrantPopulation` returns that zero with an explanation of why
  the axis definitions make Defend near-unreachable, rather than inventing a member for it.
- **Maturity** is CMMI-style across capability areas: each focus area carries a current and a target
  level 1–5 with `gap = target - current`, or stays unassessed with an explicit
  `insufficientEvidence` flag. Unassessed areas are excluded from every mean, never counted as zero
  (26 of 28 seeded focus areas are assessed). Two frameworks are defined in `lib/types.ts` — CMMI
  Capability Maturity at five levels, flagged recommended and used by the seeded assessment, and a
  four-level Digital Maturity Ladder — so the ladder is presented as selectable with CMMI as the
  default, though the per-engagement choice is not yet a stored field.
- **Wave sequencing is constrained by typed dependencies.** Five dependency types with hard/soft
  strength; `finish_to_start` and `enables` at `hard` strength constrain sequencing, the rest are
  advisory. `earliestStart` returns the first wave an initiative could legally occupy, `detectCycles`
  reports circular chains over all types, and `feasibilityIssues` names dependency violations,
  unsequenced initiatives, missing owners on the critical path, waves carrying more than three L+
  initiatives, and unsequenceable cycles — each with the single smallest change that clears it.

## What is real and what is mocked

| Real | Mocked or absent |
| --- | --- |
| The whole calculation engine: weighting, bands, both axes, quadrants, maturity gaps and roll-ups, initiative and theme roll-ups, earliest start, cycle detection, feasibility | AI model calls. Nothing in the build talks to a model; the six `AISuggestion` records are hand-written seed data carrying `modelVersion: 'mock-v1'` |
| The propose-review-commit mechanics around AI output: accept, accept-with-edits and reject all work, accepting mutates the working model, rejecting does not, and both write audit events | Document ingestion. Evidence and findings are seeded; there is no upload or parsing path, and no write endpoints for evidence or findings |
| Publishing: snapshots are real deep-frozen copies at version *n+1*, with derived values computed at publish time and eleven selection flags controlling content and client permissions | Deliverable export. The client portal is generated from the model, but there is no PPTX or XLSX generation yet |
| The client feedback loop: submissions are validated against the snapshot's own permissions, and accepting a ranking writes `clientRank`, timing feedback moves the initiative's wave, and a dependency suggestion creates the dependency (refusing it if it would close a cycle) | Cost, capacity and ROI. Not modelled at all — see limitations |
| Auth and role separation: signed cookie sessions, middleware redirects, and a server-side role check in every route handler and page | Production auth. Plaintext seeded credentials, no registration or reset |
| Persistence: a JSON document store with an audit trail on every mutation, file-backed locally | A shared database. Persistence is per-instance and lost on a serverless cold start |
| Seed realism: 36 scored opportunities, 12 initiatives, 4 themes, 4 waves, 10 dependencies, 28 maturity focus areas across 8 capability areas, 14 evidence records, 12 findings, 4 decisions, and a version 1 snapshot with a pending client comment | Northwind Distribution itself. The client, every quote, finding and score is invented for the demo |

## Known limitations and what was deferred

Scope decisions, taken deliberately for a hackathon build:

- **Cold-start persistence.** Edits survive locally and inside one warm serverless instance; a cold
  start reloads the seed. A shared database was out of scope, and the demo path completes inside one
  instance.
- **Plaintext demo credentials.** Four seeded users with plaintext passwords printed on the landing
  page, so a reviewer can switch between both experiences instantly. Hashing without a signup flow
  would have added nothing a reviewer could see.
- **One seeded engagement.** The model is engagement-scoped throughout and every query filters on
  `engagementId`, but only `eng_northwind` exists and there is no engagement-creation screen.
- **No document ingestion.** The PRD's structure-preserving XLSX/PPTX/PDF parser is the largest
  single piece of the specification and could not be built credibly in the time; evidence and
  findings are therefore seeded and read-only, with no write endpoints.
- **No cost or capacity model.** The reference engagement carried effort as T-shirt sizes and span,
  and contained no cost model, no ROI and no capacity forecast. Inventing one and rendering it beside
  numbers traceable to the source would be fabrication, so effort stops at T-shirt size.
- **No PowerPoint or Excel generation from the model.** The client portal is the generated
  deliverable; a board deck rendered from a named snapshot is the obvious next step and is not built.
  The submission deck in `deck/` was authored by hand, not produced from the model.
- **The write surface stops short of the fact base.** Scoring, wave assignment and dependency
  create/delete are editable in the workspace UI, but there are no write endpoints for evidence or
  findings and no editor over them, and ranking is a typed position rather than drag-to-rank —
  client ranking and the register's order are both typed integers, with no drag-and-drop anywhere.
- **AI Review offers accept and reject in the UI.** Accept-with-edits (`status: "edited"` with a
  replacement payload) exists in the API and is honoured, but has no form.
- **Filtering covers two screens, and nothing sorts.** The opportunity register filters by theme,
  capability area and priority band, and the published portal roadmap filters by theme, both through
  the query string. Maturity, Initiatives, the Fact Base and portal initiatives are still grouped for
  reading — waves on the roadmap, themes on initiatives — rather than filterable, and no screen
  offers a sort control.
- **`POST /api/dev/reset` is unauthenticated**, on purpose, so the demo can be reset from anywhere.
  It would not exist in a real deployment.
- **No live deployment is claimed.** The reviewable path is the local run above.

## Repository map

```
app/
  page.tsx                     Landing page with both sign-in cards and the demo credentials
  login/                       Sign in, with quick-fill for each seeded user
  error.tsx, not-found.tsx     Error boundary and 404 page, so no failure shows a stack trace
  workspace/                   Aberdeen shell, aberdeen role only. Ten routes under nine sidebar
                               areas: Overview, Fact Base, Maturity, Opportunities, Initiatives,
                               Roadmap, AI Review, Publish, Client Feedback — plus
                               opportunities/[oppId], the per-opportunity scoring view, which is
                               reached from the register rather than listed in the sidebar
  portal/                      Client shell, reads the latest snapshot only. Five screens:
                               Overview, Roadmap, Initiatives, Decisions, My Feedback
  api/                         19 route files, 20 handlers; each re-checks the role server-side
components/                    Shell navigation, preview banner, FilterBar.tsx (query-string
                               filtering), and typed UI primitives
lib/
  types.ts                     The domain model and its invariants
  calc.ts                      Pure calculation engine — every derived number in the product
  seed.ts                      buildSeed(): the Northwind Distribution engagement
  store.ts                     JSON document store: getDb, mutate, resetToSeed, audit trail
  publish.ts                   Snapshot selection, construction, deep-freezing
  view.ts                      Read models joining working data to its derived values
  auth.ts                      Cookie sessions and the server-side role gates
  api.ts, page.ts, nav.ts      Route-handler helpers, page guards, navigation
middleware.ts                  Edge-runtime redirects for /workspace and /portal
scripts/check-calc.ts          22 assertions over the engine and the seed
scripts/e2e-happy-path.py      Playwright run of the whole demo path: 113 assertions
deck/                          The four-slide submission deck
docs/                          The two specifications behind the build, plus the client's
                               one-pager and MVP specification
```

The API surface, all under `/api`: `auth/login`, `auth/logout`, `auth/me`, `dev/reset`,
`engagements`, `engagements/{id}`, `…/feasibility`, `…/opportunities/{oppId}`,
`…/opportunities/{oppId}/score`, `…/initiatives/{initId}`, `…/maturity/{focusAreaId}`,
`…/dependencies`, `…/dependencies/{depId}`, `…/ai-suggestions`, `…/ai-suggestions/{suggestionId}`,
`…/publish`, `…/published`, `…/submissions`, `…/submissions/{subId}`.

Two specifications sit in `docs/`, both written before the build:

- **`docs/PRD.md`** — the full requirements document (about 178,000 words). It reverse-engineers the
  reference engagement's workbooks and decks into numbered functional requirements, acceptance
  criteria and AI capability specs, and it is the authority on the analytical method, the eighteen
  observed defects quoted in the problem section above, and every place the evidence ran out.
- **`docs/aberdeen-transformation-roadmap-platform-prd-liv.md`** — the build-ready MVP specification
  (about 48,000 words) written for an engineering agent. Read this one for product framing: the
  interface split, the AI-proposes / code-calculates boundary, and what the MVP deliberately will not
  do.
