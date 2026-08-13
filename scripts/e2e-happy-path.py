#!/usr/bin/env python3
"""
Conductor end-to-end happy path.

Drives the whole demo through the real UI with Playwright: sign in as the Aberdeen engagement
lead, change the working model and watch the derived values move, publish a version, sign in as
the client, submit feedback, come back as Aberdeen, accept one item and reject another, republish,
and confirm the client portal reflects exactly the accepted change. Role boundaries are asserted
through the browser and again at the API level.

Every step asserts an observable outcome and fails loudly. Nothing is skipped on failure.

Usage
-----
    python3 scripts/e2e-happy-path.py [--base-url http://localhost:3111] [--headed]
                                      [--state-dir DIR] [--no-reset]

The run starts by POSTing /api/dev/reset, so it is repeatable from the seed.

Requires playwright 1.56.0 against the preinstalled Chromium (build 1194). Do not run
`playwright install` — PLAYWRIGHT_BROWSERS_PATH already points at it.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Callable

from playwright.sync_api import Page, sync_playwright

# ---------------------------------------------------------------------------------------------
# Fixtures from lib/seed.ts. Everything the script touches is named here so a seed change that
# breaks the demo fails as a missing id rather than as a mystery timeout.
# ---------------------------------------------------------------------------------------------

ENGAGEMENT = "eng_northwind"

LEAD_EMAIL = "liv@aberdeenadvisors.com"
LEAD_PASSWORD = "conductor2026"
LEAD_NAME = "Liv DeSantis"
CIO_EMAIL = "cio@northwind-distribution.com"
CIO_PASSWORD = "client2026"
CIO_NAME = "Dana Whitfield"

# Rescored in step 3: 4/3/3 -> 3.40 Medium Priority / Plan & Fund becomes 5/5/5 -> 5.00 Critical /
# Act Now, so the weighted score, the band and the quadrant all have to move.
SCORE_OPP = "opp_004"
SCORE_OPP_CODE = "OPP-004"
BEFORE_SCORES = {"financialImpact": "4", "riskIfDeferred": "3", "strategicAlignment": "3"}
BEFORE_WEIGHTED, BEFORE_BAND, BEFORE_QUADRANT = "3.40", "Medium Priority", "Plan & Fund"
AFTER_SCORES = {"financialImpact": "5", "riskIfDeferred": "5", "strategicAlignment": "5"}
AFTER_WEIGHTED, AFTER_BAND, AFTER_QUADRANT = "5.00", "Critical", "Act Now"

# The seeded dependency violation and the move that clears it.
VIOLATION_INIT = "init_b2b_portal"
VIOLATION_INIT_NAME = "B2B Customer Portal"
VIOLATION_BLOCKER_NAME = "Integration Layer Replatform"
VIOLATION_FROM_WAVE = "wave_2"
VIOLATION_TO_WAVE = "wave_3"

# The dependency added by hand in step 3.
NEW_DEP_FROM, NEW_DEP_FROM_NAME = "init_cyber_uplift", "Cyber Resilience Uplift"
NEW_DEP_TO, NEW_DEP_TO_NAME = "init_analytics_platform", "Analytics Platform & Data Products"

# Client submissions raised in step 7.
COMMENT_OPP = "opp_003"
RANK_OPP, RANK_OPP_CODE, RANK_POSITION = "opp_012", "OPP-012", "9"
TIMING_INIT, TIMING_INIT_NAME = "init_warehouse_automation", "Warehouse Automation Pilot"
TIMING_WAVE, TIMING_WAVE_LABEL = "wave_4", "Wave 4 — H2 2028"
SUGGEST_DEP_FROM, SUGGEST_DEP_FROM_NAME = "init_field_sales", "Field Sales Enablement"
SUGGEST_DEP_TO, SUGGEST_DEP_TO_NAME = "init_pricing_engine", "Dynamic Pricing Engine"

TIMEOUT = 20_000

# ---------------------------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------------------------

PASSES: list[str] = []
FAILURES: list[str] = []


class StepFailed(AssertionError):
    pass


def step(number: int, title: str) -> None:
    print(f"\n=== STEP {number}: {title}", flush=True)


def section(title: str) -> None:
    print(f"\n=== {title}", flush=True)


def check(name: str, condition: bool, detail: str = "") -> None:
    """Record an assertion. A failure aborts the run — a later step would only cascade."""
    if condition:
        PASSES.append(name)
        print(f"PASS  {name}", flush=True)
        return
    FAILURES.append(name)
    print(f"FAIL  {name}{(' — ' + detail) if detail else ''}", flush=True)
    raise StepFailed(f"{name}{(' — ' + detail) if detail else ''}")


def check_soon(
    name: str,
    predicate: Callable[[], bool],
    detail: Callable[[], str] = lambda: "",
    timeout_ms: int = TIMEOUT,
) -> None:
    """
    Assert something that becomes true once a `router.refresh()` has re-rendered the server
    components. Polls rather than sleeping, so a slow first compile in dev mode is not a failure —
    but a value that never arrives still fails.
    """
    deadline = time.monotonic() + timeout_ms / 1000
    while True:
        try:
            if predicate():
                check(name, True)
                return
        except Exception:  # noqa: BLE001 — a locator that is mid-render raises; keep polling
            pass
        if time.monotonic() >= deadline:
            break
        time.sleep(0.25)
    try:
        explanation = detail()
    except Exception as error:  # noqa: BLE001
        explanation = f"(could not read the actual value: {error})"
    check(name, False, explanation)


# ---------------------------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------------------------


def contains(haystack: str, needle: str) -> bool:
    """Badges are uppercased in CSS, so on-screen text is compared case-insensitively."""
    return needle.casefold() in haystack.casefold()


def same(actual: str, expected: str) -> bool:
    return actual.strip().casefold() == expected.casefold()


def post_json(url: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload or {}).encode()
    request = urllib.request.Request(
        url, data=body, headers={"content-type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def working_model(page: Page, base_url: str) -> dict:
    """The canonical working model, read as Aberdeen. Used to prove a mutation really landed."""
    response = page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}")
    if not response.ok:
        raise StepFailed(f"GET /api/engagements/{ENGAGEMENT} returned {response.status}")
    return response.json()["view"]


def initiative(view: dict, initiative_id: str) -> dict:
    for row in view["initiatives"]:
        if row["id"] == initiative_id:
            return row
    raise StepFailed(f"Initiative {initiative_id} is not in the working model")


def opportunity(view: dict, opportunity_id: str) -> dict:
    for row in view["opportunities"]:
        if row["id"] == opportunity_id:
            return row
    raise StepFailed(f"Opportunity {opportunity_id} is not in the working model")


def submissions(page: Page, base_url: str) -> list[dict]:
    response = page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}/submissions")
    if not response.ok:
        raise StepFailed(f"GET submissions returned {response.status}")
    return response.json()["submissions"]


def stat(page: Page, label: str) -> str:
    """The value of the StatCard whose label is `label`."""
    return page.locator("p.label", has_text=label).first.locator(
        "xpath=following-sibling::p[1]"
    ).inner_text().strip()


def sign_in(page: Page, base_url: str, email: str, password: str, expect_path: str) -> None:
    page.goto(f"{base_url}/login", wait_until="networkidle")
    page.fill("#email", email)
    page.fill("#password", password)
    page.click("button[type=submit]")
    page.wait_for_url(f"{base_url}{expect_path}", timeout=TIMEOUT)
    page.wait_for_load_state("networkidle")


def sign_out(page: Page, base_url: str) -> None:
    page.click("text=Sign out")
    page.wait_for_url(f"{base_url}/login**", timeout=TIMEOUT)
    page.wait_for_load_state("networkidle")


def wait_toast(page: Page, fragment: str) -> str:
    toast = page.locator('[role=status]', has_text=fragment).first
    toast.wait_for(state="visible", timeout=TIMEOUT)
    return toast.inner_text().strip()


def settle(page: Page) -> None:
    """Wait for a router.refresh() to have re-rendered the server components."""
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)


# ---------------------------------------------------------------------------------------------
# The run
# ---------------------------------------------------------------------------------------------


def run(base_url: str, headed: bool, state_dir: str, reset: bool) -> None:
    if reset:
        counts = post_json(f"{base_url}/api/dev/reset")
        print(f"Reset to seed: {json.dumps(counts['counts'])}  storage={counts['storageMode']}")

    os.makedirs(state_dir, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.set_default_timeout(TIMEOUT)
        page = context.new_page()

        # -----------------------------------------------------------------------------------
        step(1, "Sign in as the Aberdeen engagement lead")
        # -----------------------------------------------------------------------------------
        page.goto(base_url, wait_until="networkidle")
        check(
            "1.1 landing page offers both sign-in routes",
            "Conductor" in page.title() or page.locator("text=Conductor").count() > 0,
            f"title was {page.title()!r}",
        )
        sign_in(page, base_url, LEAD_EMAIL, LEAD_PASSWORD, "/workspace")
        check("1.2 signed in as Aberdeen lands on /workspace", page.url == f"{base_url}/workspace", page.url)
        check(
            f"1.3 the session belongs to {LEAD_NAME}",
            page.locator(f"text={LEAD_NAME}").count() > 0,
        )
        me = page.request.get(f"{base_url}/api/auth/me").json()
        check(
            "1.4 /api/auth/me reports the aberdeen role",
            me.get("user", {}).get("role") == "aberdeen",
            json.dumps(me),
        )
        context.storage_state(path=os.path.join(state_dir, "aberdeen.json"))

        # -----------------------------------------------------------------------------------
        step(2, "Open the seeded engagement on the workspace overview")
        # -----------------------------------------------------------------------------------
        check(
            "2.1 the overview names the seeded engagement",
            page.locator("h1", has_text="Northwind Distribution").count() > 0,
            page.locator("h1").first.inner_text(),
        )
        check(
            "2.2 every opportunity in the register is scored",
            stat(page, "Opportunities scored") == "36/36",
            stat(page, "Opportunities scored"),
        )
        check("2.3 the overview shows 12 initiatives", stat(page, "Initiatives") == "12", stat(page, "Initiatives"))
        check(
            "2.4 the overview reports the feasibility issues in the current plan",
            stat(page, "Feasibility issues") == "3",
            stat(page, "Feasibility issues"),
        )
        check(
            "2.5 the quadrant population states why Defend is empty",
            page.locator('text=No opportunity lands in "Defend"').count() > 0,
        )

        # -----------------------------------------------------------------------------------
        step(3, "Change the working model and confirm the derived values move")
        # -----------------------------------------------------------------------------------
        section("3a  rescore one opportunity")
        page.goto(f"{base_url}/workspace/opportunities", wait_until="networkidle")
        register_row = page.locator("tr", has_text=SCORE_OPP_CODE).first
        check(
            f"3a.1 the register lists {SCORE_OPP_CODE} at {BEFORE_WEIGHTED} / {BEFORE_BAND} / {BEFORE_QUADRANT}",
            contains(register_row.inner_text(), BEFORE_WEIGHTED)
            and contains(register_row.inner_text(), BEFORE_BAND)
            and contains(register_row.inner_text(), BEFORE_QUADRANT),
            register_row.inner_text().replace("\n", " | "),
        )
        page.click(f'a[href="/workspace/opportunities/{SCORE_OPP}"]')
        page.wait_for_url(f"{base_url}/workspace/opportunities/{SCORE_OPP}", timeout=TIMEOUT)
        settle(page)
        check(
            "3a.2 the scoring view shows the anchor rubric for all three dimensions",
            page.locator("text=Anchor rubric").count() > 0
            and page.locator("text=Financial impact").count() > 0
            and page.locator("text=Risk if deferred").count() > 0
            and page.locator("text=Strategic alignment").count() > 0,
        )
        check(
            f"3a.3 derived values before the edit are {BEFORE_WEIGHTED} / {BEFORE_BAND} / {BEFORE_QUADRANT}",
            stat(page, "Weighted score") == BEFORE_WEIGHTED
            and same(page.get_by_test_id("derived-band").inner_text(), BEFORE_BAND)
            and same(page.get_by_test_id("derived-quadrant").inner_text(), BEFORE_QUADRANT),
            f"{stat(page, 'Weighted score')} / {page.get_by_test_id('derived-band').inner_text()} / "
            f"{page.get_by_test_id('derived-quadrant').inner_text()}",
        )
        save = page.get_by_test_id("save-score")
        check(
            "3a.4 the primary button's label is legible against its dark fill",
            save.evaluate("el => getComputedStyle(el).color") == "rgb(255, 255, 255)"
            and save.inner_text().strip() != "",
            f"colour {save.evaluate('el => getComputedStyle(el).color')}, "
            f"text {save.inner_text()!r}",
        )
        for field, value in AFTER_SCORES.items():
            page.get_by_test_id(f"score-{field}").select_option(value)
        page.get_by_test_id("save-score").click()
        toast = wait_toast(page, "Weighted score")
        check(f"3a.5 saving confirms the recomputed score ({toast})", AFTER_WEIGHTED in toast, toast)
        settle(page)
        check_soon(
            f"3a.6 the weighted score moved {BEFORE_WEIGHTED} -> {AFTER_WEIGHTED}",
            lambda: stat(page, "Weighted score") == AFTER_WEIGHTED,
            lambda: stat(page, "Weighted score"),
        )
        check_soon(
            f"3a.7 the priority band moved {BEFORE_BAND} -> {AFTER_BAND}",
            lambda: same(page.get_by_test_id("derived-band").inner_text(), AFTER_BAND),
            lambda: page.get_by_test_id("derived-band").inner_text(),
        )
        check_soon(
            f"3a.8 the quadrant moved {BEFORE_QUADRANT} -> {AFTER_QUADRANT}",
            lambda: same(page.get_by_test_id("derived-quadrant").inner_text(), AFTER_QUADRANT),
            lambda: page.get_by_test_id("derived-quadrant").inner_text(),
        )
        page.goto(f"{base_url}/workspace/opportunities", wait_until="networkidle")
        register_row = page.locator("tr", has_text=SCORE_OPP_CODE).first
        check(
            "3a.9 the register agrees with the scoring view after the edit",
            contains(register_row.inner_text(), AFTER_WEIGHTED)
            and contains(register_row.inner_text(), AFTER_BAND)
            and contains(register_row.inner_text(), AFTER_QUADRANT),
            register_row.inner_text().replace("\n", " | "),
        )

        section("3b  the feasibility view reports the deliberately violated dependency")
        page.goto(f"{base_url}/workspace/roadmap", wait_until="networkidle")
        feasibility = page.locator("tr").filter(
            has_text=re.compile("dependency violation", re.I)
        ).first
        check(
            "3b.1 the seeded dependency violation is reported by name",
            feasibility.count() > 0
            and contains(feasibility.inner_text(), VIOLATION_INIT_NAME)
            and contains(feasibility.inner_text(), VIOLATION_BLOCKER_NAME),
            feasibility.inner_text().replace("\n", " | ") if feasibility.count() else "no such row",
        )
        check(
            "3b.2 the violation states the minimum fix",
            contains(feasibility.inner_text(), "Wave 3"),
            feasibility.inner_text().replace("\n", " | "),
        )
        check(
            f"3b.3 {VIOLATION_INIT_NAME} sits in the Wave 2 column and is flagged too early",
            contains(
                page.get_by_test_id(f"wave-card-{VIOLATION_FROM_WAVE}").inner_text(),
                VIOLATION_INIT_NAME,
            )
            and contains(
                page.get_by_test_id(f"wave-card-{VIOLATION_FROM_WAVE}").inner_text(), "Too early"
            ),
            page.get_by_test_id(f"wave-card-{VIOLATION_FROM_WAVE}").inner_text().replace("\n", " | "),
        )

        section("3c  move an initiative's wave and check the roadmap follows")
        page.get_by_test_id(f"wave-select-{VIOLATION_INIT}").select_option(VIOLATION_TO_WAVE)
        toast = wait_toast(page, VIOLATION_INIT_NAME)
        check(f"3c.1 the move is confirmed ({toast})", "Wave 3" in toast, toast)
        settle(page)
        check_soon(
            f"3c.2 the roadmap now shows {VIOLATION_INIT_NAME} in the Wave 3 column",
            lambda: contains(
                page.get_by_test_id(f"wave-card-{VIOLATION_TO_WAVE}").inner_text(),
                VIOLATION_INIT_NAME,
            ),
            lambda: page.get_by_test_id(f"wave-card-{VIOLATION_TO_WAVE}")
            .inner_text()
            .replace("\n", " | "),
        )
        check_soon(
            "3c.3 it has left the Wave 2 column",
            lambda: not contains(
                page.get_by_test_id(f"wave-card-{VIOLATION_FROM_WAVE}").inner_text(),
                VIOLATION_INIT_NAME,
            ),
            lambda: page.get_by_test_id(f"wave-card-{VIOLATION_FROM_WAVE}")
            .inner_text()
            .replace("\n", " | "),
        )
        check_soon(
            "3c.4 moving it cleared the dependency violation",
            lambda: page.locator("tr")
            .filter(has_text=re.compile("dependency violation", re.I))
            .count()
            == 0,
            lambda: str(
                page.locator("tr")
                .filter(has_text=re.compile("dependency violation", re.I))
                .count()
            ),
        )
        check(
            "3c.5 the wave move is in the canonical model",
            initiative(working_model(page, base_url), VIOLATION_INIT)["waveId"] == VIOLATION_TO_WAVE,
        )

        section("3d  add a dependency")
        dependencies_before = int(stat(page, "Dependencies"))
        page.get_by_test_id("dep-from").select_option(NEW_DEP_FROM)
        page.get_by_test_id("dep-to").select_option(NEW_DEP_TO)
        page.get_by_test_id("dep-type").select_option("enables")
        page.get_by_test_id("dep-strength").select_option("soft")
        page.get_by_test_id("dep-rationale").fill(
            "Cyber controls have to be in place before customer data lands in the analytics platform."
        )
        page.get_by_test_id("add-dependency").click()
        wait_toast(page, "Dependency added")
        settle(page)
        check_soon(
            f"3d.1 the dependency count went {dependencies_before} -> {dependencies_before + 1}",
            lambda: int(stat(page, "Dependencies")) == dependencies_before + 1,
            lambda: stat(page, "Dependencies"),
        )
        dep_row = page.locator("tr", has_text=NEW_DEP_FROM_NAME).filter(has_text=NEW_DEP_TO_NAME)
        check_soon(
            "3d.2 the new dependency appears in the dependency table",
            lambda: dep_row.count() > 0,
            lambda: "no row joins the two initiatives",
        )
        check(
            "3d.3 it is recorded as a soft enables dependency",
            contains(dep_row.first.inner_text(), "Enables")
            and contains(dep_row.first.inner_text(), "soft"),
            dep_row.first.inner_text().replace("\n", " | "),
        )
        view = working_model(page, base_url)
        check(
            "3d.4 the dependency is in the canonical model",
            any(
                d["fromInitiativeId"] == NEW_DEP_FROM
                and d["toInitiativeId"] == NEW_DEP_TO
                and d["type"] == "enables"
                for d in view["dependencies"]
            ),
        )
        check(
            "3d.5 the dependency graph is still acyclic",
            view["cycles"] == [],
            json.dumps(view["cycles"]),
        )
        check(
            "3d.6 the two remaining feasibility issues are the unassigned wave and the missing owner",
            sorted({i["type"] for i in view["feasibility"]})
            == ["missing_owner_on_critical_path", "unassigned_wave"],
            json.dumps([i["type"] for i in view["feasibility"]]),
        )

        section("3e  filter the register")
        page.goto(f"{base_url}/workspace/opportunities", wait_until="networkidle")
        total_rows = page.locator("tbody tr").count()
        page.get_by_test_id("filter-band").select_option("Critical")
        page.wait_for_url("**/workspace/opportunities?band=Critical", timeout=TIMEOUT)
        settle(page)
        check_soon(
            "3e.1 filtering the register by band is a URL and narrows the table",
            lambda: 0 < page.locator("tbody tr").count() < total_rows,
            lambda: f"{page.locator('tbody tr').count()} of {total_rows} rows",
        )
        check(
            "3e.2 every remaining row is in the filtered band",
            all(
                contains(row, "Critical")
                for row in page.locator("table").last.locator("tbody tr").all_inner_texts()
            ),
        )
        page.get_by_test_id("filter-clear").click()
        page.wait_for_url(f"{base_url}/workspace/opportunities", timeout=TIMEOUT)
        settle(page)
        check_soon(
            "3e.3 clearing the filter restores the whole register",
            lambda: page.locator("tbody tr").count() == total_rows,
            lambda: f"{page.locator('tbody tr').count()} of {total_rows} rows",
        )

        # -----------------------------------------------------------------------------------
        step(4, "Publish the roadmap and the initiatives to the client portal")
        # -----------------------------------------------------------------------------------
        page.goto(f"{base_url}/workspace/publish", wait_until="networkidle")
        check(
            "4.1 the portal is currently on published version 1",
            stat(page, "Published version") == "1",
            stat(page, "Published version"),
        )
        roadmap_box = page.get_by_test_id("publish-includeRoadmap")
        initiatives_box = page.get_by_test_id("publish-includeInitiatives")
        decisions_box = page.get_by_test_id("publish-includeDecisions")
        if not roadmap_box.is_checked():
            roadmap_box.check()
        if not initiatives_box.is_checked():
            initiatives_box.check()
        # Leave the decision log out, so step 6 can prove the selection really governs the portal.
        if decisions_box.is_checked():
            decisions_box.uncheck()
        check(
            "4.2 roadmap and initiatives are selected and the decision log is not",
            roadmap_box.is_checked() and initiatives_box.is_checked() and not decisions_box.is_checked(),
        )
        page.fill(
            "#publish-note",
            "Adds the sequencing and the initiatives. The decision log follows in the next version.",
        )
        page.get_by_test_id("publish-now").click()
        toast = wait_toast(page, "Published version")
        check(f"4.3 publishing confirms version 2 ({toast})", "version 2" in toast, toast)
        settle(page)
        check_soon(
            "4.4 the workspace now reports published version 2",
            lambda: stat(page, "Published version") == "2",
            lambda: stat(page, "Published version"),
        )
        check_soon(
            "4.5 a version 2 row is in the version history",
            lambda: page.locator("tr", has_text="v2").count() > 0,
            lambda: "no v2 row in the history table",
        )
        snapshot = page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}/published").json()[
            "snapshot"
        ]
        check("4.6 the latest snapshot is version 2", snapshot["version"] == 2, str(snapshot["version"]))
        check(
            "4.7 the version 2 snapshot froze 12 initiatives, 4 waves and 11 dependencies",
            len(snapshot["payload"]["initiatives"]) == 12
            and len(snapshot["payload"]["waves"]) == 4
            and len(snapshot["payload"]["dependencies"]) == dependencies_before + 1,
            f"{len(snapshot['payload']['initiatives'])} initiatives, "
            f"{len(snapshot['payload']['waves'])} waves, "
            f"{len(snapshot['payload']['dependencies'])} dependencies",
        )
        check(
            "4.8 the version 2 snapshot carries no decisions, because they were excluded",
            snapshot["payload"]["decisions"] == []
            and snapshot["selection"]["includeDecisions"] is False,
            json.dumps(snapshot["selection"]),
        )
        check(
            "4.9 version 1 is untouched and still excludes the roadmap",
            not working_model(page, base_url)["allSnapshots"][-1]["selection"]["includeRoadmap"],
        )

        # -----------------------------------------------------------------------------------
        section("Role boundaries — Aberdeen on the portal")
        # -----------------------------------------------------------------------------------
        page.goto(f"{base_url}/portal", wait_until="networkidle")
        check(
            "R1 an aberdeen session on /portal is redirected to ?preview=1",
            page.url == f"{base_url}/portal?preview=1",
            page.url,
        )
        check(
            "R2 the preview shows the Aberdeen preview banner",
            page.locator("text=Aberdeen preview").count() > 0,
        )
        banner = page.locator("p", has_text="Aberdeen preview").first
        check(
            "R3 the preview banner names the published version it is reading",
            contains(banner.inner_text(), "reading published version 2"),
            banner.inner_text().replace("\n", " "),
        )
        page.goto(f"{base_url}/portal/feedback?preview=1", wait_until="networkidle")
        check(
            "R4 an aberdeen preview cannot raise client feedback",
            page.locator("text=Feedback controls are hidden in preview").count() > 0,
        )

        # -----------------------------------------------------------------------------------
        step(5, "Sign out and sign in as the client CIO")
        # -----------------------------------------------------------------------------------
        page.goto(f"{base_url}/workspace", wait_until="networkidle")
        sign_out(page, base_url)
        check("5.1 signing out lands on /login", page.url.startswith(f"{base_url}/login"), page.url)
        check(
            "5.2 the session is gone",
            page.request.get(f"{base_url}/api/auth/me").json().get("user") is None,
        )
        sign_in(page, base_url, CIO_EMAIL, CIO_PASSWORD, "/portal")
        check("5.3 a client signs in to /portal", page.url == f"{base_url}/portal", page.url)
        check(
            f"5.4 the session belongs to {CIO_NAME}",
            page.locator(f"text={CIO_NAME}").count() > 0,
        )
        check(
            "5.5 the client sees no Aberdeen preview banner",
            page.locator("text=Aberdeen preview").count() == 0,
        )
        context.storage_state(path=os.path.join(state_dir, "client.json"))

        # -----------------------------------------------------------------------------------
        section("Role boundaries — client")
        # -----------------------------------------------------------------------------------
        page.goto(f"{base_url}/workspace/opportunities", wait_until="networkidle")
        check(
            "R5 a client session hitting a /workspace URL is redirected to /portal",
            page.url == f"{base_url}/portal",
            page.url,
        )
        live = page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}")
        check(
            "R6 a client session cannot read live working data (403)",
            live.status == 403,
            f"status {live.status}: {live.text()[:120]}",
        )
        published = page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}/published")
        check(
            "R7 a client session can read the published snapshot (200)",
            published.status == 200 and published.json()["snapshot"]["version"] == 2,
            f"status {published.status}",
        )
        seeded_submission = "sub_001"
        patch = page.request.patch(
            f"{base_url}/api/engagements/{ENGAGEMENT}/submissions/{seeded_submission}",
            data=json.dumps({"status": "accepted"}),
            headers={"content-type": "application/json"},
        )
        check(
            "R8 a client session cannot PATCH a submission (403)",
            patch.status == 403,
            f"status {patch.status}: {patch.text()[:120]}",
        )
        check(
            "R9 the refused PATCH left the submission pending",
            page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}/submissions").json()[
                "submissions"
            ][0]["status"]
            == "pending",
        )
        for path in ("/api/engagements/eng_northwind/publish", "/api/engagements/eng_northwind/dependencies"):
            response = page.request.post(
                f"{base_url}{path}",
                data=json.dumps({}),
                headers={"content-type": "application/json"},
            )
            check(
                f"R10 a client session cannot POST {path} ({response.status})",
                response.status == 403,
                f"status {response.status}: {response.text()[:120]}",
            )

        # -----------------------------------------------------------------------------------
        step(6, "The portal shows the newly published roadmap and initiatives, and nothing excluded")
        # -----------------------------------------------------------------------------------
        page.goto(f"{base_url}/portal/roadmap", wait_until="networkidle")
        check(
            "6.1 the client roadmap is no longer the not-in-this-version placeholder",
            page.locator("text=The roadmap is not part of this published version").count() == 0,
        )
        check(
            "6.2 all four waves are published",
            page.get_by_test_id("wave-card-wave_1").count() == 1
            and page.get_by_test_id("wave-card-wave_2").count() == 1
            and page.get_by_test_id("wave-card-wave_3").count() == 1
            and page.get_by_test_id("wave-card-wave_4").count() == 1,
        )
        check(
            f"6.3 the client roadmap shows {VIOLATION_INIT_NAME} in Wave 3, as re-sequenced",
            VIOLATION_INIT_NAME in page.get_by_test_id(f"wave-card-{VIOLATION_TO_WAVE}").inner_text(),
            page.get_by_test_id(f"wave-card-{VIOLATION_TO_WAVE}").inner_text().replace("\n", " | "),
        )
        client_dep_row = page.locator("tr", has_text=NEW_DEP_FROM_NAME).filter(has_text=NEW_DEP_TO_NAME)
        check(
            "6.4 the dependency added in step 3 is visible to the client",
            client_dep_row.count() > 0,
        )
        page.goto(f"{base_url}/portal/initiatives", wait_until="networkidle")
        check(
            "6.5 the client initiatives page is no longer the placeholder",
            page.locator("text=Initiatives are not part of this published version").count() == 0,
        )
        check(
            "6.6 the published initiatives are listed with their waves",
            page.locator(f"text={VIOLATION_INIT_NAME}").count() > 0
            and page.locator(f"text={TIMING_INIT_NAME}").count() > 0,
        )
        page.goto(f"{base_url}/portal/decisions", wait_until="networkidle")
        check(
            "6.7 the excluded decision log is NOT shown to the client",
            page.locator("text=No decisions in this published version").count() > 0,
            page.locator("h1").first.inner_text(),
        )
        page.goto(f"{base_url}/portal/roadmap", wait_until="networkidle")
        theme_id = page.get_by_test_id("filter-theme").locator("option").nth(1).get_attribute("value")
        page.get_by_test_id("filter-theme").select_option(theme_id)
        page.wait_for_url(f"**/portal/roadmap?theme={theme_id}", timeout=TIMEOUT)
        settle(page)
        check_soon(
            "6.8 the client can filter the published roadmap by theme",
            lambda: page.get_by_test_id("filter-clear").count() == 1
            and page.locator("li", has_text="in this wave").count() > 0,
            lambda: "the filter did not narrow any wave column",
        )
        page.get_by_test_id("filter-clear").click()
        settle(page)

        page.goto(f"{base_url}/portal", wait_until="networkidle")
        check(
            f"6.9 the rescored {SCORE_OPP_CODE} is published at its new band",
            contains(page.locator("tr", has_text=SCORE_OPP_CODE).first.inner_text(), AFTER_BAND),
            page.locator("tr", has_text=SCORE_OPP_CODE).first.inner_text().replace("\n", " | "),
        )

        # -----------------------------------------------------------------------------------
        step(7, "The client submits a comment, a ranking, timing feedback and a dependency suggestion")
        # -----------------------------------------------------------------------------------
        page.goto(f"{base_url}/portal/feedback", wait_until="networkidle")
        pending_before = len([s for s in submissions(page, base_url) if s["status"] == "pending"])

        comment_form = page.get_by_test_id("form-comment")
        comment_form.locator("#comment-target").select_option(COMMENT_OPP)
        comment_form.locator("#comment-body").fill(
            "Retiring the pricing scripts matters more to us than the register suggests — margin leakage is daily."
        )
        comment_form.locator("button[type=submit]").click()
        wait_toast(page, "Comment sent")
        settle(page)
        raised = submissions(page, base_url)
        comment = next((s for s in raised if s["kind"] == "comment" and s["targetId"] == COMMENT_OPP), None)
        check(
            "7.1 the comment lands as a pending submission",
            comment is not None and comment["status"] == "pending" and comment["snapshotVersion"] == 2,
            json.dumps(comment) if comment else "not found",
        )

        rank_form = page.get_by_test_id("form-ranking")
        rank_form.locator("#rank-target").select_option(RANK_OPP)
        rank_form.locator("#rank-value").fill(RANK_POSITION)
        rank_form.locator("button[type=submit]").click()
        wait_toast(page, "Ranking sent")
        settle(page)
        ranking = next(
            (s for s in submissions(page, base_url) if s["kind"] == "ranking" and s["targetId"] == RANK_OPP),
            None,
        )
        check(
            f"7.2 the ranking of {RANK_OPP_CODE} at position {RANK_POSITION} lands as pending",
            ranking is not None
            and ranking["status"] == "pending"
            and ranking["payload"]["clientRank"] == int(RANK_POSITION),
            json.dumps(ranking) if ranking else "not found",
        )

        timing_form = page.get_by_test_id("form-timing")
        timing_form.locator("#timing-init").select_option(TIMING_INIT)
        timing_form.locator("#timing-wave").select_option(TIMING_WAVE)
        timing_form.locator("#timing-body").fill(
            "The pilot cannot start before the WMS work settles; put it in the last wave."
        )
        timing_form.locator("button[type=submit]").click()
        wait_toast(page, "Timing feedback sent")
        settle(page)
        timing = next(
            (
                s
                for s in submissions(page, base_url)
                if s["kind"] == "timing_feedback" and s["targetId"] == TIMING_INIT
            ),
            None,
        )
        check(
            f"7.3 the timing request for {TIMING_INIT_NAME} lands as pending",
            timing is not None
            and timing["status"] == "pending"
            and timing["payload"]["waveId"] == TIMING_WAVE,
            json.dumps(timing) if timing else "not found",
        )

        dependency_form = page.get_by_test_id("form-dependency")
        dependency_form.locator("#dep-suggest-from").select_option(SUGGEST_DEP_FROM)
        dependency_form.locator("#dep-suggest-to").select_option(SUGGEST_DEP_TO)
        dependency_form.locator("#dep-suggest-body").fill(
            "Our reps need the new tooling before dynamic prices go live, or they will quote from memory."
        )
        dependency_form.locator("button[type=submit]").click()
        wait_toast(page, "Dependency suggestion sent")
        settle(page)
        suggestion = next(
            (s for s in submissions(page, base_url) if s["kind"] == "dependency_suggestion"), None
        )
        check(
            "7.4 the dependency suggestion lands as pending",
            suggestion is not None
            and suggestion["status"] == "pending"
            and suggestion["payload"]["fromInitiativeId"] == SUGGEST_DEP_FROM
            and suggestion["payload"]["toInitiativeId"] == SUGGEST_DEP_TO,
            json.dumps(suggestion) if suggestion else "not found",
        )

        pending_after = len([s for s in submissions(page, base_url) if s["status"] == "pending"])
        check(
            f"7.5 four new pending submissions ({pending_before} -> {pending_after})",
            pending_after == pending_before + 4,
            f"{pending_before} -> {pending_after}",
        )
        check_soon(
            "7.6 the client's own feedback list shows all four as pending",
            lambda: page.locator("tr").filter(has_text=re.compile("pending", re.I)).count() >= 4,
            lambda: str(page.locator("tr").filter(has_text=re.compile("pending", re.I)).count()),
        )
        check(
            "7.7 nothing the client raised has touched the canonical model yet",
            page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}").status == 403,
        )

        # -----------------------------------------------------------------------------------
        step(8, "Sign back in as the Aberdeen lead and open the client feedback queue")
        # -----------------------------------------------------------------------------------
        sign_out(page, base_url)
        sign_in(page, base_url, LEAD_EMAIL, LEAD_PASSWORD, "/workspace")
        check("8.1 back in the workspace as Aberdeen", page.url == f"{base_url}/workspace", page.url)
        page.goto(f"{base_url}/workspace/client-feedback", wait_until="networkidle")
        check(
            "8.2 the queue reports five pending submissions",
            stat(page, "Pending review") == str(pending_after),
            stat(page, "Pending review"),
        )
        for label, subid in (
            ("comment", comment["id"]),
            ("ranking", ranking["id"]),
            ("timing feedback", timing["id"]),
            ("dependency suggestion", suggestion["id"]),
        ):
            card = page.get_by_test_id(f"submission-{subid}")
            check(
                f"8.3 the new {label} is listed as pending with the client's words",
                card.count() == 1 and contains(card.inner_text(), "pending"),
                card.inner_text().replace("\n", " | ") if card.count() else "card not rendered",
            )
        check(
            "8.4 the queue attributes the submissions to the client who raised them",
            page.locator(f"text={CIO_NAME}").count() >= 4,
            str(page.locator(f"text={CIO_NAME}").count()),
        )

        # -----------------------------------------------------------------------------------
        step(9, "Accept one submission and reject another")
        # -----------------------------------------------------------------------------------
        before = working_model(page, base_url)
        check(
            f"9.1 before accepting, {TIMING_INIT_NAME} is not in any wave",
            initiative(before, TIMING_INIT)["waveId"] is None,
            str(initiative(before, TIMING_INIT)["waveId"]),
        )
        check(
            f"9.2 before rejecting, {RANK_OPP_CODE} carries no client rank",
            opportunity(before, RANK_OPP)["clientRank"] is None,
            str(opportunity(before, RANK_OPP)["clientRank"]),
        )

        timing_card = page.get_by_test_id(f"submission-{timing['id']}")
        timing_card.get_by_test_id("accept-submission").click()
        toast = wait_toast(page, "Moved")
        check(
            f"9.3 accepting the timing request reports the change it made ({toast})",
            TIMING_INIT_NAME in toast and TIMING_WAVE_LABEL in toast,
            toast,
        )
        settle(page)

        rank_card = page.get_by_test_id(f"submission-{ranking['id']}")
        rank_card.locator("input[aria-label='Review note']").fill(
            "Noted, but the register keeps its own order — we will discuss it at the steering group."
        )
        rank_card.get_by_test_id("reject-submission").click()
        toast = wait_toast(page, "Rejected")
        check(
            f"9.4 rejecting says the working model is unchanged ({toast})",
            "unchanged" in toast,
            toast,
        )
        settle(page)

        after = working_model(page, base_url)
        check(
            f"9.5 accepting genuinely mutated the model: {TIMING_INIT_NAME} is now in {TIMING_WAVE_LABEL}",
            initiative(after, TIMING_INIT)["waveId"] == TIMING_WAVE,
            str(initiative(after, TIMING_INIT)["waveId"]),
        )
        check(
            f"9.6 rejecting mutated nothing: {RANK_OPP_CODE} still carries no client rank",
            opportunity(after, RANK_OPP)["clientRank"] is None,
            str(opportunity(after, RANK_OPP)["clientRank"]),
        )
        reviewed = {s["id"]: s for s in submissions(page, base_url)}
        check(
            "9.7 the accepted submission records what changed and who reviewed it",
            reviewed[timing["id"]]["status"] == "accepted"
            and reviewed[timing["id"]]["appliedChange"]
            and reviewed[timing["id"]]["reviewedBy"] == LEAD_NAME,
            json.dumps(reviewed[timing["id"]]),
        )
        check(
            "9.8 the rejected submission records no applied change",
            reviewed[ranking["id"]]["status"] == "rejected"
            and reviewed[ranking["id"]]["appliedChange"] is None
            and reviewed[ranking["id"]]["reviewNote"],
            json.dumps(reviewed[ranking["id"]]),
        )
        check(
            "9.9 accepting the wave move cleared the unassigned-wave feasibility issue",
            "unassigned_wave" not in {i["type"] for i in after["feasibility"]},
            json.dumps([i["type"] for i in after["feasibility"]]),
        )
        check_soon(
            "9.10 the reviewed table on screen names the applied change",
            lambda: page.locator("tr", has_text=TIMING_INIT_NAME)
            .filter(has_text=re.compile("accepted", re.I))
            .count()
            > 0,
            lambda: "no accepted row names the initiative",
        )
        check_soon(
            "9.11 the queue is down to three pending submissions",
            lambda: stat(page, "Pending review") == str(pending_after - 2),
            lambda: stat(page, "Pending review"),
        )
        check(
            f"9.12 the client portal still shows version 2, unaffected by the acceptance",
            TIMING_INIT_NAME
            not in page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}/published")
            .json()["snapshot"]["payload"]["waves"][0]["label"],
        )
        v2_initiatives = {
            i["id"]: i
            for i in page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}/published")
            .json()["snapshot"]["payload"]["initiatives"]
        }
        check(
            "9.13 the frozen version 2 snapshot did not absorb the acceptance",
            v2_initiatives[TIMING_INIT]["waveId"] is None,
            str(v2_initiatives[TIMING_INIT]["waveId"]),
        )

        # -----------------------------------------------------------------------------------
        step(10, "Republish and confirm the client portal reflects the accepted change")
        # -----------------------------------------------------------------------------------
        page.goto(f"{base_url}/workspace/publish", wait_until="networkidle")
        decisions_box = page.get_by_test_id("publish-includeDecisions")
        if not decisions_box.is_checked():
            decisions_box.check()
        page.fill(
            "#publish-note",
            "Warehouse Automation Pilot moves to Wave 4 at your request, and the decision log is now included.",
        )
        page.get_by_test_id("publish-now").click()
        toast = wait_toast(page, "Published version")
        check(f"10.1 publishing confirms version 3 ({toast})", "version 3" in toast, toast)
        settle(page)
        check_soon(
            "10.2 the workspace reports published version 3",
            lambda: stat(page, "Published version") == "3",
            lambda: stat(page, "Published version"),
        )
        v3 = page.request.get(f"{base_url}/api/engagements/{ENGAGEMENT}/published").json()["snapshot"]
        check("10.3 the latest snapshot is version 3", v3["version"] == 3, str(v3["version"]))
        check(
            "10.4 three snapshots are kept, so version 1 and 2 still exist",
            [s["version"] for s in working_model(page, base_url)["allSnapshots"]] == [3, 2, 1],
            json.dumps([s["version"] for s in working_model(page, base_url)["allSnapshots"]]),
        )
        check(
            f"10.5 the version 3 snapshot carries the accepted wave move for {TIMING_INIT_NAME}",
            next(i for i in v3["payload"]["initiatives"] if i["id"] == TIMING_INIT)["waveId"]
            == TIMING_WAVE,
        )
        check(
            f"10.6 the version 3 snapshot still has no client rank on {RANK_OPP_CODE}",
            next(o for o in v3["payload"]["opportunities"] if o["id"] == RANK_OPP)["clientRank"] is None,
        )

        # Confirm it as the client, in their own session, through the portal UI.
        client_context = browser.new_context(viewport={"width": 1440, "height": 900})
        client_context.set_default_timeout(TIMEOUT)
        client_page = client_context.new_page()
        sign_in(client_page, base_url, CIO_EMAIL, CIO_PASSWORD, "/portal")
        client_page.goto(f"{base_url}/portal/roadmap", wait_until="networkidle")
        check(
            "10.7 the client portal is now reading published version 3",
            client_page.locator("text=Published version 3").count() > 0,
        )
        check(
            f"10.8 the client roadmap now shows {TIMING_INIT_NAME} in {TIMING_WAVE_LABEL}",
            TIMING_INIT_NAME
            in client_page.get_by_test_id(f"wave-card-{TIMING_WAVE}").inner_text(),
            client_page.get_by_test_id(f"wave-card-{TIMING_WAVE}").inner_text().replace("\n", " | "),
        )
        client_page.goto(f"{base_url}/portal/decisions", wait_until="networkidle")
        check(
            "10.9 the decision log, ticked on for version 3, now appears",
            client_page.locator("text=No decisions in this published version").count() == 0,
        )
        client_page.goto(f"{base_url}/portal/feedback", wait_until="networkidle")
        check(
            "10.10 the client sees the accepted request and the rejection with its note",
            client_page.locator("tr").filter(has_text=re.compile("accepted", re.I)).count() >= 1
            and client_page.locator("tr").filter(has_text=re.compile("rejected", re.I)).count() >= 1,
        )
        check(
            "10.11 the accepted row states exactly what changed in the model",
            contains(
                client_page.locator("tr")
                .filter(has_text=re.compile("accepted", re.I))
                .first.inner_text(),
                TIMING_WAVE_LABEL,
            ),
            client_page.locator("tr")
            .filter(has_text=re.compile("accepted", re.I))
            .first.inner_text()
            .replace("\n", " | "),
        )
        client_context.storage_state(path=os.path.join(state_dir, "client.json"))
        client_context.close()

        # -----------------------------------------------------------------------------------
        section("Role boundaries — unauthenticated")
        # -----------------------------------------------------------------------------------
        anon = browser.new_context(viewport={"width": 1440, "height": 900})
        anon.set_default_timeout(TIMEOUT)
        anon_page = anon.new_page()
        anon_page.goto(f"{base_url}/workspace/opportunities", wait_until="networkidle")
        check(
            "R11 an unauthenticated request to /workspace is sent to /login",
            anon_page.url.startswith(f"{base_url}/login"),
            anon_page.url,
        )
        check(
            "R12 the login redirect remembers where it was going",
            "next=%2Fworkspace" in anon_page.url,
            anon_page.url,
        )
        anon_page.goto(f"{base_url}/portal/roadmap", wait_until="networkidle")
        check(
            "R13 an unauthenticated request to /portal is sent to /login",
            anon_page.url.startswith(f"{base_url}/login"),
            anon_page.url,
        )
        for path in (
            f"/api/engagements/{ENGAGEMENT}",
            f"/api/engagements/{ENGAGEMENT}/published",
            f"/api/engagements/{ENGAGEMENT}/submissions",
        ):
            response = anon_page.request.get(f"{base_url}{path}")
            check(
                f"R14 an unauthenticated GET {path} is refused ({response.status})",
                response.status == 401,
                f"status {response.status}",
            )
        anon.close()

        # The Aberdeen session is the one the screenshot pass reuses; save it last.
        context.storage_state(path=os.path.join(state_dir, "aberdeen.json"))
        context.close()
        browser.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("CONDUCTOR_URL", "http://localhost:3111"))
    parser.add_argument("--headed", action="store_true")
    parser.add_argument(
        "--state-dir",
        default=os.environ.get("CONDUCTOR_STATE_DIR", "/tmp/conductor-e2e"),
        help="Where the signed-in storage states are written, for reuse by the screenshot pass.",
    )
    parser.add_argument("--no-reset", action="store_true", help="Do not reset to the seed first.")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    try:
        run(base_url, args.headed, args.state_dir, not args.no_reset)
    except StepFailed as error:
        print(f"\nABORTED: {error}", flush=True)
    except (urllib.error.URLError, OSError) as error:
        print(f"\nABORTED: could not reach {base_url} — {error}", flush=True)
        FAILURES.append(f"could not reach {base_url}")
    except Exception as error:  # noqa: BLE001 — an unexpected error is still a test failure
        print(f"\nABORTED: unexpected error — {type(error).__name__}: {error}", flush=True)
        FAILURES.append(f"unexpected error: {type(error).__name__}: {error}")

    print(f"\n{len(PASSES)} passed, {len(FAILURES)} failed")
    if FAILURES:
        for failure in FAILURES:
            print(f"  FAILED: {failure}")
        return 1
    print("Happy path complete: all ten steps and every role assertion passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
