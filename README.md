# Conductor

An AI-enabled transformation roadmap platform for Aberdeen Advisors. Conductor carries an
engagement through the firm's eight-phase methodology in one place — charter and mobilization, fact
base, maturity assessment, scored opportunity register, roadmap sequencing, investment and capacity,
business alignment and decision log, board narrative, and the living roadmap after handover —
replacing the spreadsheet-and-deck pipeline where the analysis currently lives and leaks.

Every derived number is owned by a calculation engine rather than typed into a cell, every claim
traces back to the evidence behind it, and AI proposes work that a consultant reviews and commits.

The full specification is in [docs/PRD.md](docs/PRD.md).

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # must pass with zero type errors
npm run check:calc   # calculation checks: PASS/FAIL per case, non-zero exit on failure
```

Node 20 or newer. There is no database to provision and no environment file to create.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_DIR` | `.data` | Where the JSON document store persists |
| `SESSION_SECRET` | `atlas-dev-secret` | HMAC key for the session cookie |

## Demo credentials

Shown on the landing page and available as one-click sign-in on `/login`.

| Role | Email | Password | Who |
| --- | --- | --- | --- |
| Aberdeen | `liv@aberdeenadvisors.com` | `conductor2026` | Liv DeSantis, Engagement Lead |
| Aberdeen | `ashmi@aberdeenadvisors.com` | `conductor2026` | Ashmi Chandra, Analyst |
| Client | `cio@northwind-distribution.com` | `client2026` | Dana Whitfield, Chief Information Officer |
| Client | `coo@northwind-distribution.com` | `client2026` | Marcus Reed, Chief Operating Officer |

All four are attached to one seeded engagement: **Northwind Distribution**, a fictional mid-market
wholesale distributor. Every figure in the seed is invented.

`POST /api/dev/reset` resets everything to the seed so the demo can be re-run.

## The demo path

1. Sign in as Liv. The workspace overview shows the portfolio, the quadrant population, and the
   feasibility issues in the current plan.
2. **Roadmap** reports a real dependency violation: the B2B Customer Portal sits in Wave 2 but
   depends on the Integration Layer Replatform, which is also in Wave 2. Move the portal to Wave 3
   and the issue clears.
3. **AI Review** has six proposed suggestions. Accepting one applies it to the working model and
   writes an audit event; rejecting one changes nothing.
4. **Publish** — version 1 deliberately excluded the roadmap and the initiatives, so ticking them
   and publishing version 2 visibly adds content to the client portal.
5. Sign in as Dana. The portal reads only the published snapshot. Rank an opportunity or ask for
   different timing.
6. Back as Liv, **Client Feedback** accepts it — a ranking writes the client rank onto the
   opportunity, timing feedback moves the initiative's wave — and records exactly what changed.

## Architecture

```
app/                     Next.js 15 App Router
  page.tsx               Landing page with both sign-in cards
  login/                 Login with quick-fill for each demo user
  workspace/             Aberdeen shell + nine areas (aberdeen role only)
  portal/                Client shell + five areas (reads snapshots only)
  api/                   Route handlers; every one re-checks the role server-side
components/ui/           Typed primitives, exported from components/ui/index.ts
lib/
  types.ts               The domain model
  seed.ts                buildSeed(): Database — the Northwind engagement
  store.ts               Single JSON document store: getDb, mutate, resetToSeed
  calc.ts                Pure calculation engine — every derived number
  publish.ts             Snapshot construction and freezing
  view.ts                Read models joining working data to derived values
  auth.ts                Cookie session, getSession, requireRole
middleware.ts            Redirects for /workspace and /portal
scripts/check-calc.ts    22 assertions over the engine and the seed
```

### Derived values are never stored

`OpportunityScore` holds three integers. The weighted score, priority band, business-value and
urgency axes, and the 2x2 quadrant are computed in `lib/calc.ts` on every read, so the register and
the board pack cannot disagree. `Opportunity` carries no `themeId` either — theme membership is
derived through its initiative.

Weights are 0.40 financial impact, 0.35 risk if deferred, 0.25 strategic alignment, and
`weightedScore` throws if a model's weights do not sum to 1.0. Bands are inclusive lower bounds at
4.5 / 3.75 / 2.8; the quadrant threshold is 3.5 on both axes.

### The empty quadrant is surfaced, not hidden

No opportunity in the seeded register lands in **Defend**, and `quadrantPopulation` says so with the
reason: business value averages strategic alignment with financial impact, and strategic alignment
co-varies with risk if deferred, so a high-urgency item almost always clears the value threshold.
That is a property of the framework, not a gap in the analysis, and the product states it rather
than hand-typing a member into the bucket.

### Publishing

The client portal reads only from the latest `PublishedSnapshot`. A snapshot is a deep-frozen copy
of exactly the entities the publish selection includes, plus the derived values computed at publish
time. Editing working data afterwards cannot change an already published version — which is what
makes the portal a deliverable rather than a live view.

## Demo-build limitations

These are deliberate for a two-hour build and must not be mistaken for production behaviour.

**Persistence is per-instance and ephemeral.** The store keeps the database in a module-level
singleton keyed on `globalThis` (so hot reload does not reset it) and writes it to
`process.env.DATA_DIR ?? '.data'`, falling back to `/tmp/atlas-data`, and finally to memory only if
neither is writable. The active mode is reported as `storageMode: 'file' | 'memory'` and shown in
the workspace sidebar. On a serverless host the filesystem is ephemeral and per-instance: an edit
survives within the instance that handled it, but a cold start — or a request routed to a different
instance — reloads the seed and the edit is gone. There is no shared database. Every demo flow is
completable inside one warm instance.

**Authentication is not real.** Passwords are stored in plaintext in the seed and compared
directly. The session cookie is an HMAC-signed payload (`crypto.createHmac`, `SESSION_SECRET`), so
it is tamper-evident but readable, and it is httpOnly with `sameSite=lax`. There is no
registration, password reset, or rate limiting. Role checks are enforced server-side in every route
handler and page — `middleware.ts` only handles redirects — but none of this is suitable for real
credentials.

**AI output is mocked.** Every `AISuggestion` carries `modelVersion: 'mock-v1'`. No model is called;
the suggestions are hand-written to be representative. What is real is the review flow: accepting a
suggestion genuinely mutates the canonical model and writes an audit event.

**`POST /api/dev/reset` is unauthenticated** so the demo can be re-run from anywhere. It would not
exist in a real deployment.
