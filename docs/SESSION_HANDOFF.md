# Session Handoff — Onboarding Team Sync

**Last updated:** 2026-05-22 (Friday)
**Next weekly sync:** Wednesday 2026-05-27
**For the next session:** read this first. Scope has expanded beyond the login experiment — now includes Onboarding Courses MVP, verification gap (Yurii's incident), and Beauty PLG discovery prep.

---

## TL;DR — three workstreams now

**1. Login experiment (Flow A vs Flow B) — CALLED for Flow B**
- 13 days of clean post-rollout data. Sample 1,671 NEW devices.
- Flow B wins on completion (+6.7pp), forgot-password friction (−23pp), accidental signups (−54%).
- Support tickets confirm: **0 accidental cancellations in May** (20 days in), vs 3 in April.
- Recommendation made May 20: ship Flow B, configure Descope as Flow B.
- Last refresh: May 20. Need a fresh pull Monday/Tuesday before the May 27 weekly.

**2. Verification gap — NEW work area, post Yurii's May 18 incident**
- Yurii flagged after the abuse incident `inc-264-abuse-of-shops-and-short-links`: indy barber accounts get created without phone/email being verified. Backend already has `phoneVerified`+`emailVerified` columns (Dec 2024 migration), but the app doesn't gate creation on them.
- PDE + Onboarding aligned (Shae May 18): phone verification will be mandatory at signup. Ticket **SQR-12354**. Backend PR **#18180** (Julian Amarilla) already prevents indy login without `phoneVerified=true`.
- Open: phone-only vs email-only vs both. Twilio under investigation for stronger phone validation.

**3. Onboarding Courses MVP — scope adjusted at May 20 weekly**
- Course 1 (Getting bookable): 🟢 ready, native screens exist.
- Course 2 (Rounding out / migration): 🟡 partial, credentials flow works, CSV/wipe/reviews backend-blocked.
- Course 3 (Getting paid): 🟢 ready, but **DEFERRED** to after first appointment (banking is high-friction up front).
- Course 4 (Engage/Operator/Flex): **REMOVED** from MVP, becomes standalone courses later.
- Tristan working on prototypes + Maze test for lightweight UX validation.

**Live URLs:**
- Tracker: https://santi-squire.github.io/onboarding-team-sync/tracker/
- May 20 deck: https://santi-squire.github.io/onboarding-team-sync/weekly/2026-05-20/

---

## What to do at the start of the next session

**Before Wednesday May 27 weekly sync:**

1. **Read this file** + `data/2026-05-08.json` for full current state.
2. **Re-pull all 10 queries** for the latest data (queries documented below). Today's been Friday, by Monday/Tuesday there will be 2-4 more days of data.
3. **Update** `data/2026-05-08.json` with refreshed numbers (and `today`, `windowEnd`, etc.).
4. **Update the bar chart** in `tracker/index.html` (search for "BAR CHART: weekly accidental" — bars are hardcoded heights, need to recompute).
5. **Decide on a new deck for May 27** vs reusing May 20. If the data is similar, May 20 deck still tells the story. If you want a fresh narrative for Course progress / verification, make a new `weekly/2026-05-27/` from the May 20 template.
6. **Commit + push to main** (allowed via `.claude/settings.local.json`).
7. **Sync with Tristan beforehand** on the items in the "with Tristan" list below.

---

## File map (project structure)

```
/Users/santianaya/code/onboarding-team-sync/
├── data/
│   ├── 2026-05-06.json   — Week 1 snapshot (Friday May 8 historical)
│   └── 2026-05-08.json   — Main current snapshot (refreshed daily)
├── tracker/
│   └── index.html        — The tracker page (renders from data/*.json)
├── weekly/
│   └── 2026-05-13/
│       ├── index.html    — Today's sync deck (single-page scrollable)
│       └── assets/
│           ├── current-login.png            — Old production login (no Descope)
│           ├── descope-flowA.png            — Descope as Flow A
│           ├── descope-flowB-1-email.png    — Descope as Flow B step 1
│           └── descope-flowB-2-password.png — Descope as Flow B step 2
├── docs/
│   ├── SESSION_HANDOFF.md       — this file
│   ├── HISTORICAL_QUERIES.sql   — pre-saved historical queries (Q1, Q2, Q3)
│   └── CLARITY_IOS_PROMPT.md    — prompt for iOS Claude session to install Clarity
├── index.html            — Week 1 weekly deck (reveal.js, less relevant now)
├── README.md
└── .claude/settings.local.json  — has `Bash(git push:*)` and `Bash(snow sql *)` allowed
```

---

## Methodology — key definitions

**Indie (in IDENTIFIES):** `CONTEXT_TRAITS_ROLE = 'barber'` AND `CONTEXT_TRAITS_USER_TYPE IS NULL`. Rental and Commission are user_type values for shop-employed barbers; indies have no shop relationship.

**Accidental indie (proxy):** an indie whose email also belongs to a separate user_id with `CONTEXT_TRAITS_USER_TYPE IN ('Rental', 'Commission')`. Likely a duplicate created by mistake (invited barber didn't realize they already had a shop account).

**NEW devices post-100% (the clean experiment sample):** devices whose first IDENTIFIES event is on or after `2026-05-07`. Filters out pre-experiment legacy users who are stuck on Flow A via sticky LD bucketing.

**Pre-experiment 8-week baseline:** Mar 9 - Apr 20 (7 full weeks). Wider than 3-week baseline to be more stable.

**Experiment window:** Apr 30 (deploy) onwards. 100% rollout was May 7.

---

## Queries to re-run for daily refresh

All queries use `snow sql --connection default --format json -q "..."`. Inline single-statement form to satisfy the permission hook.

### 1. Variant balance (post-100% ALL + NEW)

```sql
WITH new_devices AS (
  SELECT ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
  GROUP BY ANONYMOUS_ID HAVING MIN(TIMESTAMP) >= '2026-05-07'
)
SELECT 'all' AS pool, VARIANT,
  COUNT(DISTINCT ANONYMOUS_ID) AS devices,
  COUNT(DISTINCT USER_ID) AS logged_in,
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)) AS actors,
  COUNT(*) AS events
FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED
WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB')
GROUP BY VARIANT
UNION ALL
SELECT 'new_only', VARIANT,
  COUNT(DISTINCT ANONYMOUS_ID), COUNT(DISTINCT USER_ID),
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)), COUNT(*)
FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED
WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB')
  AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
GROUP BY VARIANT
ORDER BY pool, VARIANT;
```

### 2. Funnel (NEW only)

```sql
WITH new_devices AS (SELECT ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.IDENTIFIES WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE()) GROUP BY ANONYMOUS_ID HAVING MIN(TIMESTAMP) >= '2026-05-07'),
steps AS (
  SELECT 'a_assigned' AS step, VARIANT, ANONYMOUS_ID
  FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED
  WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB') AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
  UNION ALL
  SELECT 'b_welcome', VARIANT, ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.WELCOME_SCREEN_VIEWED
  WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB') AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
  UNION ALL
  SELECT 'c_succeeded', VARIANT, ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.LOGIN_SUCCEEDED
  WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB') AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
)
SELECT VARIANT, step, COUNT(DISTINCT ANONYMOUS_ID) AS devices
FROM steps GROUP BY VARIANT, step ORDER BY VARIANT, step;
```

### 3. Email check (NEW only, Flow B)

```sql
WITH new_devices AS (SELECT ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.IDENTIFIES WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE()) GROUP BY ANONYMOUS_ID HAVING MIN(TIMESTAMP) >= '2026-05-07')
SELECT RESULT, INPUT_TYPE, COUNT(*) AS events,
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)) AS users,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM RAW.RUDDER_EVENTS.EMAIL_CHECK_RESULT
WHERE TIMESTAMP >= '2026-05-07' AND VARIANT = 'flowB'
  AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
GROUP BY RESULT, INPUT_TYPE ORDER BY events DESC;
```

### 4. Per-exposure account creation (NEW only)

```sql
WITH new_devices AS (SELECT ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.IDENTIFIES WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE()) GROUP BY ANONYMOUS_ID HAVING MIN(TIMESTAMP) >= '2026-05-07')
SELECT VARIANT, ACCOUNT_TYPE, CAME_FROM, COUNT(DISTINCT USER_ID) AS users
FROM RAW.RUDDER_EVENTS.ACCOUNT_CREATED
WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB')
  AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
GROUP BY VARIANT, ACCOUNT_TYPE, CAME_FROM ORDER BY VARIANT, users DESC;
```

### 5. Friction (NEW only)

```sql
WITH new_devices AS (SELECT ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.IDENTIFIES WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE()) GROUP BY ANONYMOUS_ID HAVING MIN(TIMESTAMP) >= '2026-05-07'),
all_friction AS (
  SELECT 'login_failed' AS event, VARIANT FROM RAW.RUDDER_EVENTS.LOGIN_FAILED
    WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB') AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
  UNION ALL
  SELECT 'forgot_password', VARIANT FROM RAW.RUDDER_EVENTS.FORGOT_PASSWORD_TAPPED
    WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB') AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
  UNION ALL
  SELECT 'login_abandoned', VARIANT FROM RAW.RUDDER_EVENTS.LOGIN_ABANDONED
    WHERE TIMESTAMP >= '2026-05-07' AND VARIANT IN ('flowA','flowB') AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
)
SELECT event, VARIANT, COUNT(*) AS events FROM all_friction GROUP BY event, VARIANT ORDER BY event, VARIANT;
```

### 6. Email_entry abandoners followup (NEW only Flow B)

```sql
WITH new_devices AS (SELECT ANONYMOUS_ID FROM RAW.RUDDER_EVENTS.IDENTIFIES WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE()) GROUP BY ANONYMOUS_ID HAVING MIN(TIMESTAMP) >= '2026-05-07'),
email_abandoners AS (
  SELECT ANONYMOUS_ID, MIN(TIMESTAMP) AS first_abandon_ts
  FROM RAW.RUDDER_EVENTS.LOGIN_ABANDONED
  WHERE TIMESTAMP >= '2026-05-07' AND VARIANT = 'flowB' AND LAST_STEP_REACHED = 'email_entry'
    AND ANONYMOUS_ID IN (SELECT ANONYMOUS_ID FROM new_devices)
  GROUP BY ANONYMOUS_ID
),
with_outcomes AS (
  SELECT ea.ANONYMOUS_ID,
    MAX(CASE WHEN ls.TIMESTAMP > ea.first_abandon_ts THEN 1 ELSE 0 END) AS later_login,
    MAX(CASE WHEN ac.TIMESTAMP > ea.first_abandon_ts THEN 1 ELSE 0 END) AS later_signup,
    MAX(CASE WHEN i.TIMESTAMP > ea.first_abandon_ts THEN 1 ELSE 0 END) AS later_identify
  FROM email_abandoners ea
  LEFT JOIN RAW.RUDDER_EVENTS.LOGIN_SUCCEEDED ls ON ea.ANONYMOUS_ID = ls.ANONYMOUS_ID
  LEFT JOIN RAW.RUDDER_EVENTS.ACCOUNT_CREATED ac ON ea.ANONYMOUS_ID = ac.ANONYMOUS_ID
  LEFT JOIN RAW.RUDDER_EVENTS.IDENTIFIES i ON ea.ANONYMOUS_ID = i.ANONYMOUS_ID
  GROUP BY ea.ANONYMOUS_ID, ea.first_abandon_ts
)
SELECT COUNT(*) AS total_email_abandoners,
  SUM(later_login) AS later_logged_in,
  SUM(later_signup) AS later_signed_up,
  SUM(CASE WHEN later_login = 0 AND later_signup = 0 AND later_identify = 1 THEN 1 ELSE 0 END) AS came_back_no_outcome,
  SUM(CASE WHEN later_login = 0 AND later_signup = 0 AND later_identify = 0 THEN 1 ELSE 0 END) AS truly_lost
FROM with_outcomes;
```

### 7. Accidental indies weekly

```sql
WITH indie_users AS (
  SELECT USER_ID, MAX_BY(CONTEXT_TRAITS_EMAIL, TIMESTAMP) AS email,
    MIN(TIMESTAMP) AS first_seen
  FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE()) AND CONTEXT_TRAITS_ROLE = 'barber'
  GROUP BY USER_ID
  HAVING MAX_BY(CONTEXT_TRAITS_USER_TYPE, TIMESTAMP) IS NULL
),
shop_barber_emails AS (
  SELECT DISTINCT CONTEXT_TRAITS_EMAIL AS email FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
    AND CONTEXT_TRAITS_ROLE = 'barber'
    AND CONTEXT_TRAITS_USER_TYPE IN ('Rental','Commission')
    AND CONTEXT_TRAITS_EMAIL IS NOT NULL
)
SELECT DATE_TRUNC('week', i.first_seen)::DATE AS week_start,
  COUNT(*) AS total_indies_with_email,
  SUM(CASE WHEN sbe.email IS NOT NULL THEN 1 ELSE 0 END) AS accidental_indies,
  ROUND(100.0 * SUM(CASE WHEN sbe.email IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS accidental_pct
FROM indie_users i
LEFT JOIN shop_barber_emails sbe ON i.email = sbe.email
WHERE i.email IS NOT NULL
GROUP BY week_start ORDER BY week_start;
```

### 8. Barber breakdown weekly (Rental / Commission / Indie)

```sql
SELECT DATE_TRUNC('week', first_seen)::DATE AS week_start,
  COUNT(*) AS new_barbers,
  SUM(CASE WHEN final_user_type = 'Rental' THEN 1 ELSE 0 END) AS rental,
  SUM(CASE WHEN final_user_type = 'Commission' THEN 1 ELSE 0 END) AS commission,
  SUM(CASE WHEN final_user_type IS NULL THEN 1 ELSE 0 END) AS indies
FROM (
  SELECT USER_ID, MIN(TIMESTAMP) AS first_seen,
    MAX_BY(CONTEXT_TRAITS_USER_TYPE, TIMESTAMP) AS final_user_type
  FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
    AND CONTEXT_TRAITS_ROLE = 'barber'
  GROUP BY USER_ID
)
GROUP BY week_start ORDER BY week_start;
```

### 9. Active users base weekly

```sql
SELECT DATE_TRUNC('week', TIMESTAMP)::DATE AS week_start,
  COUNT(DISTINCT ANONYMOUS_ID) AS distinct_devices
FROM RAW.RUDDER_EVENTS.IDENTIFIES
WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
GROUP BY week_start ORDER BY week_start;
```

### 10. Duplicate barber accounts per email weekly

```sql
WITH barber_first_seen AS (
  SELECT USER_ID, CONTEXT_TRAITS_EMAIL AS email, MIN(TIMESTAMP) AS first_seen
  FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
    AND CONTEXT_TRAITS_ROLE = 'barber' AND CONTEXT_TRAITS_EMAIL IS NOT NULL
  GROUP BY USER_ID, CONTEXT_TRAITS_EMAIL
),
enriched AS (
  SELECT USER_ID, email, first_seen,
    COUNT(*) OVER (PARTITION BY email ORDER BY first_seen
                   ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prior_user_ids
  FROM barber_first_seen
)
SELECT DATE_TRUNC('week', first_seen)::DATE AS week_start,
  COUNT(*) AS new_barber_user_ids,
  SUM(CASE WHEN prior_user_ids > 0 THEN 1 ELSE 0 END) AS duplicates,
  ROUND(100.0 * SUM(CASE WHEN prior_user_ids > 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS duplicate_pct
FROM enriched
GROUP BY week_start ORDER BY week_start;
```

---

## Current numbers (as of 2026-05-20 refresh)

These are in `data/2026-05-08.json`. Next refresh updates these.

**Post-100% NEW devices (canonical clean sample):**
- flowA: 850 devices, 198 logged-in
- flowB: 821 devices, 13 logged-in
- Split: **50.9 / 49.1**

**Funnel NEW:**
- flowA: 850 → 790 → 390 (welcome 92.9%, conv 49.4%, **overall 45.9%**)
- flowB: 821 → 830 → 432 (welcome 101.1%, conv 52.0%, **overall 52.6%**)
- Gap: **+6.7pp** B (stable around +7-8pp this week)

**Email check NEW (Flow B):** 976 events. Returning email 52.5% / temp_password email 24.9% / new_user 16.1%.

**Friction NEW (per-device rates):**
- forgot_password: A 44.0% / B 20.9% (gap WIDENED to **−23pp** in B's favor)
- login_abandoned: A 45.1% / B 44.3% (gap FLIPPED — Flow A now slightly higher)
- login_failed: B 21.3% (A=0 due to legacy)

**Per-exposure barber signup rate NEW (FLIPPED holds):**
- flowA: 72/850 = 8.5%
- flowB: 60/821 = 7.3%
- Gap +1.2pp favoring A. Story still holds because accidental rate inside is down.

**Email_entry abandoner followup NEW:**
- Total: 83 abandoners (trend: 35 → 46 → 78 → 81 → 83)
- **Truly lost: 16 (19%)** — trend 33% → 23% → 19% → 19%. Stabilizing around 1 in 5.

**Accidental indies weekly:**
- 16-week pre-experiment baseline (Jan 5 - Apr 26): **11.6/wk avg**, ~64% rate
- Experiment 3 full weeks (Apr 27 + May 4 + May 11): 1 + 6 + 9 = 16 / 3 weeks = **5.3/wk avg**
- **Drop: −54%** (softened from -75% as May weeks reclassified up — week-of-May-11 went 7 → 9)
- CS confirms: **0 accidental cancellations in May** (20 days in)

**Total indies weekly:** Pre 19.5/wk → Experiment 9.0/wk (−54%).

**Duplicate email rate:** Pre 15.7% / Experiment 15.4% (within noise, no signal).

**Scope leak (signup_link_tapped, Flow B):**
- Flat at 3 devices for 3 days running (May 18-19-20). 3.23.1 may not have rolled out fully OR fix didn't cover all paths.
- **NOTE for next session:** confirmed in PR review — **PR #4143 was scope-leak fix, merged for 3.23.1** (May 8). PR #4151 was release-3.23.2 on top of develop, includes Clarity + cheat-code hotfix but does NOT re-include the scope leak fix (already shipped in 3.23.1). The 3 devices we still see are likely users on old 3.23.0 who haven't updated.

**CS data (McChesney Matro):** April 3 / May 0 accidental cancellations. Consider asking for a fresh pull through May 22.

---

---

## Verification gap · context for next session

**Trigger:** Yurii's May 18 message in `#inc-264-abuse-of-shops-and-short-links` after the abuse incident. "We are allowing account creation without verifying the phone number first... We should require phone verification before officially creating the account."

**State:**
- Backend has `emailVerified`, `emailVerificationToken`, `emailVerifyExpiresAt`, plus phone equivalents (squire-api migration Dec 2024, file `migrations/20241211172543-add_token_verification_on_users.js`).
- **PR #18180** (Julian Amarilla, squire-api) makes indy barbers unable to log in without `phoneVerified=true`. Question Shae raised: "can we just make it mandatory for account creation? I don't want to block login for existing folks." Cutoff date proposed: Apr 1.
- Ticket: **SQR-12354**.
- Shae also has SQR-12335 for gating transactional comms behind SHO + fraud check.

**Three options on the table** (cards in May 20 deck):
- **A) Phone mandatory, email later** — matches PDE's current plan, backend PR ready.
- **B) Email mandatory, phone only for SMS** — Santi's alternative, lower friction, phone gates the abusable surface (SMS).
- **C) Both mandatory** — strictest, closes both holes but more friction.

**Decision deferred at May 20 weekly.** Open for next sync.

**Existing reusable infra in mobile:**
- `src/components/settings/VerificationCodeSheet/` — generic 6-digit code BottomSheet, currently used in settings to change phone/email. Reusable for the gate.
- `src/components/welcome/SignUpWebViewModal/` — signup is a WebView wrapper today. Verification (if any) is web's responsibility.

**Mockup live in:** May 20 deck verification section. Three phone-style screens: today's login, existing SMS verify, proposed gate (pending list with tap-to-verify).

---

## Onboarding Courses MVP · state after May 20

**MVP scope adjusted at the May 20 weekly:**
- Course 1 (Getting bookable: hours / services / staff / portfolio) — 🟢 ready, native exists, just wrap.
- Course 2 (Rounding out / migration): 🟡 partial.
  - Clients via credentials — 🟢 easy, iOS ships it (Booksy, Vagaro, Square + 16 platforms).
  - Services implicit — 🟢 free, comes with credentials.
  - CSV upload — 🟡 backend-blocked (no barber-scoped endpoints).
  - Wipe last batch — 🟡 same backend blocker.
  - Reviews import — 🔴 blocked on 3 fronts (backend + no Reputation surface + no iOS reference). DEFER.
- Course 3 (Getting paid: Stripe / bank / tap-to-pay) — 🟢 ready BUT **DEFERRED to after first appointment** (high friction, decided May 20).
- Course 4 (Engage / Operator / Flex / SMS) — **REMOVED from MVP**, will be standalone courses later. Each is a full product suite, not a checklist item.

**Out of V1 scope (RN rebuild):**
- CSV imports (clients + services)
- Wipe last imported batch
- Reviews import
- Flex / Operator / SMS native

**WIP video** captured in `weekly/2026-05-20/assets/courses-wip.mp4` — Course 1 bottom-sheet flow prototype.

---

## Open questions to investigate (Slack channel)

- Twilio (or similar) for stronger phone validation — SMS alone is spoofable, Yurii investigating.
- How long until the temp user expires if they never verify (need a window — 7d? 30d? auto-cleanup?).

## With Tristan · decide / investigate together (1:1)

- Phone-only, email-only, or both for signup gating · pros/cons of each
- Which existing feature flags can we reuse to gate features until verified
- Courses sequential (1 → 2 → 3) or available at any time
- Resumable course state — mid-course exit vs finished, what shows where (purple dot in settings was Tristan's idea)
- Course 2 migration tool problems (not React Native ready)
- Step 4 removal — webview, "Coming soon", or no mention in MVP
- Pilot Claude design → React Native pipeline (start with the verification gate?)
- Maze test scope — what we validate, who tests, when (Ben Paddock suggested this at May 20 weekly)

## Action items from May 20 weekly (per Gemini meeting summary)

- **Santi + Tristan:** discuss verification requirements, restrict access via feature flags
- **Yurii:** analyze phone validation (Twilio etc), technical implications and constraints
- **The group:** determine overall onboarding verification strategy
- **Tristan:** complete remaining prototypes, design Maze usability test, schedule migration review meeting
- **Tristan + Santi:** evaluate current migration tool, address issues this week (May 22 = today)
- **The group:** research course accessibility (simultaneous vs sequential)

---

## Beauty PLG · separate workstream

**Discovery Brief:** "Discovery Brief: PLG Onboarding (for beauty)" by Tristan, v0.08, on Confluence (page 4665016341).

**Context:** Squire entering Beauty Salons vertical. Wants PLG-first onboarding (no concierge), unlike historical concierge-only. Tristan = DRI.

**4 courses framework** (same as our indie barber onboarding):
- Alpha: everyone concierge while team validates what's automatable
- Beta: in-app checklist with milestone descriptions + CS fallback
- GA: fully self-serve

**Where Onboarding Team intersects (relevant for upcoming live review meeting):**
- Stylist invite flow ↔ our barber invite work (temp_password catch ~25% on Flow B)
- Per-feature onboarding analysis — who owns
- Indie stylist PLG path overlaps with existing indie barber flow
- Need event-spec from day 1 of Alpha (don't repeat the retrofit pain we had with login experiment)

**Questions to bring to that meeting:**
- 27-day baseline: indie barbers or averaged across segments?
- Per-feature onboarding analysis — Onboarding Team owns?
- Pre-logged-in flows — Alex + Meli? (open question in the brief)
- Customer Experience intervention framework — Snowflake or just CS tickets?
- Device strategy (mobile / web / both) — brief is ambiguous

---

## People context

| Person | Role | Notes |
|---|---|---|
| Eric Pannese | Manager, non-technical | Loved "we fixed the door, now we fix the hallway" framing (became unofficial slogan). Wants past-vs-present narratives. |
| Tristan Nguyen | PM / designer | 5h timezone offset. Owns Course prototypes + Maze test design. iOS imports flagged as "not great" — RN is a chance to do better. |
| Yurii Petelko | iOS lead, manager | Flagged the verification gap May 18 after the incident. Investigating Twilio for stronger phone validation. |
| Ben Paddock | New attendee at May 20 weekly | Suggested using Maze for usability testing the lightweight onboarding UX before investing in final assets. Argued for either-or verification (like banking apps). |
| Julian Amarilla | Backend dev | Owns PR #18180 (squire-api) — phone-verified gate on indy login. Cutoff date proposed Apr 1. |
| Shae Williams | PDE | Anchor for SQR-12354 (phone validation before account creation) + SQR-12335 (gate transactional comms by SHO + fraud check). |
| McChesney Matro | CS team | Pulls the accidental-cancellation xlsx. April 3 / May 0. Ping again Monday for refresh through May 22. |
| Matthew Barker | IT / Cloudflare ops | Owns Cloudflare rate-limit + block rules during incident. Discovered abuse patterns in shop names containing "PayPal", etc. |
| Frank Parry | SES email / abuse | Worked on AWS SES email reputation recovery during the incident. PR #18186 (squire-api) adds tagging to outbound SES emails. |
| Assis Ngolo | Backend | Working on the `/pos/receipt/:transactionIdentifier` endpoint that was the abuse vector. |
| Denis K | Snowflake admin | Pending key-pair JWT auth setup (externalbrowser still works fine). |

---

## Pending threads / open items

**Slack threads to check on:**
- **Tristan** — sent him the deck link + asked if he wants a sync before today's meeting. No reply yet.
- **Eric** — answered his "how do we identify accidental indies" question. Awaiting any follow-up.
- **Yurii** — closed the estimation thread with "fair, will go with weeks". Active conversation about Tristan design pace ongoing.

**Action items (May 22 onwards, prep for May 27 weekly):**
1. **Refresh tracker Monday or Tuesday.** All 10 queries. Compare to May 20 (1,671 NEW devices). Update bar chart heights (hardcoded in `tracker/index.html` `renderHistoricalComparison`).
2. **Decide May 27 deck approach.** Either reuse May 20 deck (story still holds), or make `weekly/2026-05-27/` for a Course-focused update.
3. **Tristan 1:1 before Wednesday** — work through the "with Tristan" list above. Verification options, course resumability, migration tool scope.
4. **Ping McChesney** for fresh CS accidental-cancellation pull through May 22.
5. **Watch the bar chart fill-in pattern.** Apr 27 went 0 → 1 across refreshes as users got reclassified. May 11 went 7 → 9. Expect post-rollout numbers to keep drifting up slightly. Drop signal still strong (−54%) but flagging it so we don't oversell "−75%".

**Investigations done, no need to redo:**
- ✅ SRM root cause (sticky LD bucketing + gradual rollout)
- ✅ iOS firing context for LOGIN_EXPERIMENT_ASSIGNED (only at auth flow start)
- ✅ Indie classification (role=barber + user_type IS NULL)
- ✅ Indie channel separate from experiment (only 2/69 overlap)
- ✅ Shop tenure breakdown of accidental indies (50% same-day-or-earlier = likely legit transitions)
- ✅ Email_entry abandoner followup methodology
- ✅ Email/phone verification backend infra exists (migration 20241211 in squire-api)
- ✅ Mobile signup is currently a WebView wrapper (`SignUpWebViewModal`), no native verification
- ✅ PR #4143 = scope-leak fix shipped in 3.23.1. PR #4151 = release-3.23.2 (Clarity + bigsmoke hotfix), doesn't re-include the fix (already in 3.23.1).
- ✅ Confirmed Yurii's incident traces to phone-verification hole, NOT email. The fix-in-progress (SQR-12354) is phone-only.

---

## Slack tone reminders (for drafting messages on Santi's behalf)

- **Casual, lowercase-ish** on Slack
- Avoid em-dashes ("—") in body. Use periods.
- Headlines + bullets > paragraphs
- No hedging ("largely", "essentially", "significantly")
- Numbers always have context (% + raw count when useful)
- For Eric: non-technical phrasing. No SQL terms, no schema names.
- For Tristan: more familiar tone OK, he'll engage with detail.
- For Yurii: direct, transparent, no pleasing.

---

## Tools / commands quick reference

**Run a Snowflake query:**
```bash
snow sql --connection default --format json -q "SELECT ..."
```

**Local dev server (for tracker + deck):**
```bash
python3 -m http.server 8765
# Then: http://localhost:8765/tracker/ or http://localhost:8765/weekly/2026-05-13/
```

**Push to deploy (allowed without prompt):**
```bash
git add data/2026-05-08.json tracker/index.html weekly/
git commit -m "..."
git push origin main
```

**Wait for Pages build (background):**
```bash
until [[ "$(gh api repos/santi-squire/onboarding-team-sync/pages/builds --jq '.[0].commit')" =~ ^<commit_sha> && "$(gh api repos/santi-squire/onboarding-team-sync/pages/builds --jq '.[0].status')" == "built" ]]; do sleep 4; done
```

---

## Important conventions

- **Don't push without explicit user confirmation** in most cases. The user manually approves pushes for live updates.
- **Validate JSON before committing**: `node -e "JSON.parse(require('fs').readFileSync('data/2026-05-08.json'));console.log('OK')"`
- **Validate JS in tracker** before push: extract `<script>` and `new Function(code)` to catch syntax errors.
- **The user is in auto mode often** — they'll tell you when to interrupt vs continue.
