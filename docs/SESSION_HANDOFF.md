# Session Handoff — Onboarding Experiment Tracker

**Last updated:** 2026-05-18 (Monday refresh, new week)
**For the next session:** read this first, then continue work on the tracker / next deck if needed.

---

## TL;DR — where things stand

**Login experiment (Flow A vs Flow B):**
- SRM **resolved** on clean NEW-device data: 50.7 / 49.3
- Flow B winning overall completion by **+14pp** (40.5% vs 54.7%)
- Accidental indie signups down **~69%** vs 8-week pre-experiment baseline
- **CS team confirmed**: 0 accidental indy self-signup cancellations in May vs 3 in April
- Flow B has higher login_abandoned at the new email_entry step, but 69% of abandoners return and complete (concern downgraded)

**RN migration:**
- Auth moving to **Descope** (auth-as-a-service). The flow can be configured as Flow A or Flow B.
- Tristan handles final styling, I handle functionality.

**Live URLs:**
- Tracker: https://santi-squire.github.io/onboarding-team-sync/tracker/
- Today's sync deck (May 13): https://santi-squire.github.io/onboarding-team-sync/weekly/2026-05-13/

---

## What to do at the start of the next session

1. **Read this file** + read `data/2026-05-08.json` for the current full data state.
2. **Re-pull data for today** (May 13 or later). Queries are documented below.
3. **Update the snapshot** `data/2026-05-08.json` with the refreshed numbers.
4. **Update today's deck** `weekly/2026-05-13/index.html` if there are any newsworthy changes (the deck has hardcoded numbers; review the big number cards and scorecard).
5. **Commit + push to main** (allowed via `.claude/settings.local.json` permission rule).
6. **Wait for GitHub Pages build** before reporting "live".

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

## Current numbers (as of 2026-05-18 refresh)

These are the values currently in `data/2026-05-08.json`. Next refresh should update these.

**Post-100% NEW devices (canonical clean sample):**
- flowA: 716 devices, 167 logged-in, 384 actors
- flowB: 704 devices, 11 logged-in, 299 actors
- Split: **50.4 / 49.6**

**Funnel NEW:**
- flowA: 716 → 663 → 320 (welcome 92.6%, conv 48.3%, **overall 44.7%**)
- flowB: 697 → 706 → 370 (welcome 101.3%, conv 52.4%, **overall 53.1%**)
- Gap: **+8.4pp** for Flow B (stable around 8pp across the week).

**Email check NEW (Flow B):**
- 827 total events
- returning email: 419 (50.7%)
- temp_password email: 216 (26.1%)
- new_user email: 136 (16.4%)

**Friction NEW (per-device rates):**
- forgot_password: A 37.4% / B 22.0% (gap widened to −15pp in B's favor)
- login_abandoned: A 42.0% / B 45.8% (gap CLOSED from +19 to +4)
- login_failed: B 21.7% (A=0 due to legacy version data quality issue)

**Per-exposure barber signup rate NEW (FLIPPED this week):**
- flowA barber/signup_link: 58/716 = 8.1%
- flowB barber/email_not_found: 55/697 = 7.9%
- Flow A barely higher now (was A 7.2 / B 9.8 last week)

**Email_entry abandoner followup NEW:**
- Total: 78 unique (was 46)
- Came back & logged in: 36 (46%)
- Came back & signed up: 13 (17%)
- Came back no outcome: 15 (19%)
- **Truly lost: 18 (23%)** — DROPPED from 33% last week. Trend improving.

**Accidental indies weekly:**
- 16-week pre-experiment baseline (Jan 5 - Apr 26): 11.7/wk avg, ~64% rate
- Experiment (Apr 27 - May 18): 4.3/wk avg over 3 full weeks
- **−63% drop** on the wider baseline (was -75% last week with partial data — May 11 settled higher at 7)

**Total indies weekly:**
- Pre-experiment 16wk: 19.4/wk
- Experiment: 8.7/wk
- **−55% drop**

**Duplicate email rate weekly:**
- Pre-experiment 8wk: 15.8% avg
- Experiment: 15.1% avg
- **−4% (inside noise)**

**Scope leak (signup_link_tapped, Flow B):**
- May 13: 1 event / 1 device
- May 18: 3 events / 3 devices — GREW
- PR #4143 was merged for 3.23.1 release. Either it hasn't fully shipped or the fix didn't cover all firing paths. **Worth checking with iOS team.**

**CS data (McChesney Matro · pulled 2026-05-11):**
- April 2026: 3 accidental indy self-signup cancellations
- May 2026: 0 (through May 11; consider asking McChesney for a refresh through May 18)

**Clarity status:**
- Deployed on iOS (per Yurii/Santi sync). First sessions available.
- Action: review recordings with Tristan, focus on email-step abandons and forgot_password Flow A.

---

## People context

| Person | Role | Notes |
|---|---|---|
| Eric (ericp) | Manager, non-technical | Wants story "new flow vs old", not just B vs A. Currently asking about accidental indie identification methodology. |
| Tristan | PM | Recently moved to 5h offset timezone. OOO last week. Designs for the 4 Onboarding Courses not all done. Owns final styling of Descope screens. Suggested CS data pull, did it via McChesney. |
| Yurii Petelko | iOS lead, manager | Direct. Recommends estimating in weeks (not hours). Wants to discuss design pace with me. Disagrees with the idea Tristan has heavy load from other teams. |
| Marti | Suggested hours-per-task estimation in her thread | Yurii pushed back on that; we tabled it as retrospective tracking. |
| Artur Badretdinov | Backend / cost-aware | Asked about how we connect to Snowflake. We're using `snow` CLI with externalbrowser SSO; NOT using Cortex AI billing services. |
| Denis K | Snowflake admin | Was supposed to run an ALTER USER for key-pair JWT auth so I don't have to do browser SSO each time. Status unknown, externalbrowser still works. |
| McChesney Matro | CS team | Pulled the xlsx with accidental indy cancellations. April 3 / May 0. |
| Frank | Digest project | Blocks me sometimes on queries before I can move forward (Yurii estimation thread context). |

---

## Pending threads / open items

**Slack threads to check on:**
- **Tristan** — sent him the deck link + asked if he wants a sync before today's meeting. No reply yet.
- **Eric** — answered his "how do we identify accidental indies" question. Awaiting any follow-up.
- **Yurii** — closed the estimation thread with "fair, will go with weeks". Active conversation about Tristan design pace ongoing.

**Action items (May 18 onwards):**
1. **Review Clarity sessions with Tristan** — Clarity is deployed on iOS. Need a quick sync to look at email-step abandons and Flow A forgot-password recordings.
2. **Verify scope-leak fix shipped** — PR #4143 merged for 3.23.1 but leak grew from 1 (May 13) to 3 (May 18). Worth a ping to the iOS team.
3. **Per-exposure flip** — A 8.1% vs B 7.9% this week (was A 7.2 / B 9.8 last week). Direction shifted; watch over the next 2 weeks.
4. **Truly lost in email_entry** — DROPPED to 23% (was 33% last week, 24% the week before). Trend is now improving. Cohort maturation working in our favor.
5. **Next weekly sync** — decide if we do a fresh deck this week or just walk through tracker on the call.

**Investigations done, not need to redo:**
- ✅ SRM root cause (sticky LD bucketing + gradual rollout)
- ✅ iOS firing context for LOGIN_EXPERIMENT_ASSIGNED (only at auth flow start)
- ✅ Indie classification (role=barber + user_type IS NULL)
- ✅ Indie channel separate from experiment (only 2/69 overlap with LOGIN_EXPERIMENT_ASSIGNED pop)
- ✅ Shop tenure breakdown of accidental indies (50% same-day-or-earlier = likely legit transitions)
- ✅ Email_entry abandoner followup methodology

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
