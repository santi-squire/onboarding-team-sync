# Read-Along Script · Weekly Sync 2026-05-06

Detailed text to read or paraphrase during the presentation. Each section includes **what to say** and **what each analysis means** in plain English. ~13 min total.

---

## Slide 1 · Cover

**Read:**
> "Hey team. Onboarding Team Sync, week of May 6. I'll walk us through. The plan: share results from the login experiment we shipped a week ago and align on what comes next."

---

## Slide 2 · TL;DR

**Read:**
> "Eric, you asked two days ago if we had results. The answer is yes. Four findings, in this order:"

**Then read each highlight aloud:**

> "One — Flow B is catching its target population. 33.5% of users who type their email in Flow B have an invited-barber account (temp_password). Without Flow B, those users would most likely have created duplicate accounts."

> "Two — Flow B converts better than Flow A. Login completion 67.5% vs 58.7%. Email-first does NOT break login — it improves it."

> "Three — Per device, Flow B has MORE signups via the signup path than Flow A. 14.3% vs 9.1%. If the experiment were redirecting invited barbers to login as designed, this number should go down in B, not up. We're investigating."

> "Four — There is a real Sample Ratio Mismatch. We expected 50/50, we observe 63/37. Doesn't invalidate the findings above but limits how strongly we can compare absolute counts."

> "The rest of the deck is the detail."

**Internal note**: if Eric wants to skip to discussion, you can drop most of the deck and jump to Commitments / Courses. The TL;DR carries the presentation.

---

## Slide 3 · Hito (context)

**Read:**
> "Before we get into data, context. The Onboarding squad formed 50 days ago. We started building this experiment 30 days ago. Today we're at 50% rollout, 100% tomorrow. This is an experiment within Squire of how a small focused squad performs. This first ship is the team-model proof point."

> "As a benchmark: we shipped to 2 platforms in parallel, with 9 events that are byte-for-byte identical between iOS and Android. A single Snowflake query covers both."

---

## Slide 4 · Per-exposure — the wrinkle

**What this slide actually shows:**
Counts barber-type accounts created via the signup path in each variant:
- **Flow A path**: user taps "Sign up" link in the dismissible login sheet → signup form
- **Flow B path**: user types an email that doesn't exist in our DB → auto-redirected to signup

Then we normalize by total devices in each variant (per-exposure rate).

**Read:**
> "Here's the first nuance. Looking at raw counts — 38 in Flow A, 35 in Flow B — they look similar. But per device, Flow A is 9.1%, Flow B is 14.3%. That's 57% higher in Flow B."

> "**Important**: we can't claim these are accidental without user research. They could be legit barbers who don't have an account, or invited barbers who tapped through by mistake. What we can say: if the experiment is working as expected — that is, redirecting invited barbers to login — this number should go DOWN in Flow B, not up."

> "We're surfacing this so we don't hide something that runs counter to the hypothesis. Caveats: small sample, ramp under 50% for most of the period. We're not declaring a winner."

**If Eric asks "how do you know they were accidental?":**
> "We don't know with certainty. All we measure is: users who reached the signup form. Any of them might have intended to create a new account (= legit) or not realized they had one (= accidental). The experiment was designed assuming most barbers in Squire are invited, not new. If that assumption holds, this number should drop with Flow B. If it doesn't drop, either we have fewer accidental signups than we believed, or Flow B isn't catching the problem better than A."

---

## Slide 5 · Funnel — good news (also the guardrail metric)

**What this slide actually shows:**
The login funnel: how many distinct devices made it through each step (assigned → welcome viewed → login succeeded). Conversion rate at the end.

This IS the **`overall_login_success_rate` guardrail** Tristan and I committed to in the Confluence Analytics Plan — and it came in clean.

**Read:**
> "The other side of the story. Flow B has a welcome rate of 99.6%, vs 85.6% in Flow A. Almost every user assigned to Flow B reached the welcome screen — the email-first sheet works. In Flow A, 14% of assigned users never saw the welcome — some pre-screen drop."

> "Conversion rate (succeeded ÷ welcome): 67.5% in Flow B, 58.7% in Flow A. A 9-percentage-point gap. Email-first does not break login — it improves it."

> "This derived metric is exactly the `overall_login_success_rate` guardrail Tristan and I defined in the Confluence plan. It was built to detect if either flow broke login for real users. Result: neither breaks it; B improves it."

**If Eric asks "why is welcome rate higher in B?":**
> "Flow B's sheet appears automatically after the landing screen — there's no 'tap to login' step like in Flow A. Less friction → more users get there."

---

## Slide 6 · Email check — the money signal

**What this slide actually shows:**
When a user types their email in Flow B, the API responds with one of three results:
- `returning`: account exists with a password (normal login)
- `temp_password`: account created by a shop owner, password not yet set (= invited barber, our target)
- `new_user`: email doesn't exist (genuine signup intent)

This slide shows the distribution.

**Read:**
> "And this is why Flow B works conceptually. Of users who enter an email in Flow B, 33.5% are temp_password — invited barbers whose accounts were created by their shop owner but who haven't set a password yet."

> "That's exactly the population the experiment exists to catch. Without Flow B, that 33.5% would most likely have tapped 'Sign up' by mistake and created a duplicate account. Flow A can't detect this at this resolution — it doesn't expose the routing decision."

> "The rest: 43.7% returning (normal login), 14.1% new_user (genuine signup), 9% legacy username inputs (older barbers without email)."

**For yourself (internal):** this is the most quotable slide. It's the reason Flow B makes conceptual sense.

---

## Slide 7 · Variant balance — the honesty

**What this slide actually shows:**
LD assigns 50/50, but Snowflake observes 63/37. SRM = Sample Ratio Mismatch — when actual deviates from expected. The explainer card on the slide defines the term.

**Read:**
> "Honesty: there is a real Sample Ratio Mismatch. LD assigns us 50/50, but in Snowflake — our source of truth per Yurii — we see 63/37. 13 percentage points off."

> "Why it matters: absolute comparisons (raw counts) are biased. That's why we look at per-device rates instead of totals. The qualitative conclusions (Flow B converts better, Flow B catches temp_password) don't get invalidated, but we hedge."

> "Investigation in flight with Tristan. Suspects: bucketing logic in LD, cached pre-experiment exposures, non-uniform evaluation."

---

## Slide 8 · Friction — guardrails

**What this slide actually shows:**
Three friction signals per variant — failed login attempts, forgot-password taps, and screen abandonment. Numbers are events (not distinct users).

**The exact numbers on the slide:**
- **Login attempt failed**: Flow A `0` events · Flow B `14` events (13 wrong_password + 1 network_error)
- **Forgot password tapped**: Flow A `196` events · Flow B `59` events (42 returning + 15 temp_password + 2 stray)
- **Login abandoned**: Flow A `202` events (all at password step) · Flow B `180` events (123 password + **57 at the NEW email step**)

**Read:**
> "Friction signals are comparable across variants. The new thing: Flow B has 57 abandonment events at the email step — a step Flow A doesn't have. It's expected; worth watching to see if it grows."

> "Forgot password: Flow A 196 events vs Flow B 59. Flow A is higher because its sheet is non-dismissible — frustrated users tap 'Forgot' more — and because Flow A has more total volume thanks to the SRM."

> "Login_failed: Flow A shows zero events, Flow B shows 14 events. The Flow A zero is NOT 'no failures' — it's a data quality issue: older app versions emit the legacy event without the variant property, so they get filtered out. Covered in the next slide."

**If Eric asks "why is Flow A login_failed at zero?":**
> "Versions 3.16.4 through 3.22.0 emit the legacy event without the variant property — they get filtered out of our query. Only 3.23.0 carries variant. Plus 100 events in 3.23.0 fire with variant null too — secondary issue we're auditing."

**If Eric asks "is the 57 email-step abandonment a problem?":**
> "Not yet. It's a new surface that Flow A doesn't have, so by definition it's a non-zero baseline. Worth comparing as volume grows. If it's still 57-or-similar at full rollout volume, that's good. If it scales aggressively, that's a friction signal worth investigating."

---

## Slide 9 · North star — instrumentation gap, NOT null result

**What this slide actually shows:**
North star = `account_created` with `account_type='indie'` AND `came_from='signup_link'`, segmented by variant. This is what Tristan and I committed to as the primary metric. **Result: 0 in both variants over 7 days.**

But the zero does NOT mean "the experiment failed" — it means the metric isn't readable yet.

**Read:**
> "The primary north star — indie signups via signup_link — is at zero in both variants. **This is NOT a null result.** It's likely an instrumentation gap: the property `account_type='indie'` may not be emitting correctly at indie account creation time. QA validates next week."

> "Meanwhile we use 'barber-type signups' as a proxy as we saw earlier. By path: Flow A — 38 via signup_link. Flow B — 35 via email_not_found. Same magnitude, different paths. Volume is too small to read the real north star."

**If Eric asks "is the query wrong, or are barbers missing?":**
> "The query is correct. Zero means: zero `account_created` events in these 7 days have `account_type='indie'`. Three possible causes that we'll disambiguate this week:
> - Instrumentation bug (most likely): the property isn't being set on the indie creation path
> - Genuinely low organic volume during the ramp (possible but rare)
> - The variant filter excludes indie signups (unlikely but verifiable)"

---

## Slide 10 · Caveats

**Read:**
> "Four caveats we're triaging this week. I'll go through them quickly."

> "One — the `account_type='indie'` property may not be emitting. That's why the north star is at zero. QA validates next week."

> "Two — login_attempt_failed shows zero rows for Flow A. Suspicious. Older app versions probably emit the legacy 'login_failed' event without the variant property, so they get filtered out. Cross-check next pull."

> "Three — the 63/37 SRM. Investigation with Tristan."

> "Four — there was a scope leak in signup_link_tapped: 5 events from 3 iOS devices appeared in Flow B when they should be Flow A only. Pattern: same device, 1-2 minutes apart. Flow B's 'Join for free' button shares a firing site with Flow A's 'Sign up' link. Missing variant guard — iOS-only code fix, already identified."

---

## Slide 11 · Retrospective

**Read:**
> "How shipping this experiment felt. 30 days from go-decision to first ship. 50 days since the team formed. 2 platforms, 9 events with full parity."

**For "What went well", read each title + 1 line of detail.**

**For "What slowed us down", DON'T read it as a list of complaints — frame each one with its Learning. Each slowdown teaches us something for the next project. Read the LEARNING line out loud.**

> "For example: the concurrent feature-flag tooling migration (LD → PostHog → GrowthBook) generated wiring overhead. Learning: lock the analytics destination before instrumenting."

---

## Slide 12 · Courses — next chapter

**What this slide is about:**
Courses is the next major project the squad will tackle. Tristan kicked it off pre-experiment; it lives in the "Soooooo Onboarding" Figma. The plan: prototype with Claude Design + DESIGN.md spec, iterate one at a time, coordinate with the RN launch.

**Read:**
> "Next chapter. Courses: the second of six buckets Tristan mapped out for Onboarding when the squad formed. Already kicked off pre-experiment, paused during Tristan's vacation, resuming this week."

> "The plan: take the existing Figma Tristan has, run it through Claude Design + the DESIGN.md spec — tools Anthropic and the open-source community published in April. We iterate one course at a time, validate with the team, then code. We coordinate timing with the RN app launch."

> "This is what the commitments on the next slide cover."

---

## Slide 13 · Commitments

**Read:**
> "Three decisions we're making — checkable if you agree, or push back. The rest is in flight."

**For each decision, read the text and click the checkbox visually.**

> "One — phased Courses prototyping with Tristan. Starting next week. If anything conflicts, now's the time to flag it."

> "Two — build the A and B login flows in the new RN app, in parallel with the Appointments team. Starting in 2 weeks. When we pick a winner from the experiment, RN is ready to ship."

> "Three — this one I do need clarity from Eric/Yurii on: the RN launch is May 29. Is it full feature parity, or onboarding-only first? That affects the scope of Courses for that date."

> "The 4 in-flight items are status — SRM investigation with Tristan, ship the scope-leak fix, QA validation of the indie property, weekly analytics extraction."

---

## Slide 14 · Close

**Read:**
> "That's it. Discussion, questions, or pushback?"

---

## Things to know about each metric (cheat sheet)

| Metric | What it really measures | Where the number comes from |
|---|---|---|
| **33.5% temp_password** | Of users who typed an email in Flow B and the API responded — what % had an unset-password account | `EMAIL_CHECK_RESULT` table, `result='temp_password'` rows / total Flow B rows |
| **63/37 SRM** | Of distinct devices that fired LOGIN_EXPERIMENT_ASSIGNED, what % was each variant | Snowflake `LOGIN_EXPERIMENT_ASSIGNED` distinct ANONYMOUS_ID by VARIANT |
| **9.1% / 14.3% per-exposure** | Of distinct devices in each variant, what % created a barber-type account via the signup path | numerator: `ACCOUNT_CREATED` filter (account_type=barber, came_from in [signup_link, email_not_found]), denominator: variant balance distinct devices |
| **58.7% / 67.5% conversion** | login_succeeded ÷ welcome_screen_viewed per variant | Funnel query — distinct ANONYMOUS_ID at each step |
| **0 indie north star** | account_created with account_type='indie' AND came_from='signup_link' | Same north star query as plan, returned no rows in 7 days |

---

## Coverage check vs Confluence Analytics Plan

All 9 events + the derived guardrail are in the deck:

| Plan event | In which slide |
|---|---|
| login_experiment_assigned | Slide 7 (Variant balance) |
| welcome_screen_viewed | Slide 5 (Funnel — step 2) |
| email_check_result | Slide 6 (Email check) |
| login_succeeded | Slide 5 (Funnel — step 3) |
| account_created | Slide 9 (North star) |
| login_failed | Slide 8 (Friction) + Slide 10 (asymmetry caveat) |
| forgot_password_tapped | Slide 8 (Friction) |
| signup_link_tapped | Slide 10 (scope leak caveat with diagnosis) |
| login_abandoned | Slide 8 (Friction · iOS only) |
| **overall_login_success_rate** (guardrail) | Slide 5 (Funnel — labeled in eyebrow + currentRead) |

---

## Updates from queries we ran today

### Indie validation (Query A) — partial
- 7 days post-deploy: 73 barber + 2 shop + **0 indie** account_created events
- BUT the table has no pre-deploy history (the event started tracking on 04/30)
- So we can't yet tell if the 0-indie is a bug or genuinely-low organic volume
- QA validates next week. Pre-experiment baseline pull will give us the typical indie share.

### login_failed asymmetry (Query B) — CONFIRMED
- Versions 3.16.4 → 3.22.0 emit the LEGACY login_failed event without the variant property — they get filtered out → that's where the Flow A absence comes from
- Only 3.23.0 carries variant — and even there, 100 events fire with variant null (Flow A failures may not be threading variant correctly in 3.23.0 either)
- Two issues confirmed: legacy versions (self-resolves with updates) + Flow A handler in 3.23.0 needs an audit

## Pre-experiment baseline comparison — partially in deck, more next sync

**Tristan's plan**: "no in-experiment control group; comparison vs the current login flow is done via before/after analysis at the reporting layer."

The funnel slide now flags this. Full pull next sync — query draft:

```sql
-- Pre-experiment baseline: legacy login funnel for the 7 days BEFORE the deploy
SELECT
  'pre' as bucket,
  COUNT(DISTINCT ANONYMOUS_ID) as visitors,
  -- build legacy funnel from SIGNUP_LANDING_SCREEN_VIEWED → SIGNIN_BUTTON_TAPPED → LOGIN_SUCCESSFUL
  ...
FROM RAW.RUDDER_EVENTS.SIGNUP_LANDING_SCREEN_VIEWED
WHERE TIMESTAMP BETWEEN '2026-04-23' AND '2026-04-30'
```

(I'll prepare this pre-meet next sync.)
