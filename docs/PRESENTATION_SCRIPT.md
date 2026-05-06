# Presentation Script — Weekly Sync 2026-05-06

What to say on each slide. Times are estimates. Total: ~13 min talk + 10-15 min discussion.

---

## Slide 1 · Cover (~10 sec)
> "Onboarding Team Sync, week of May 6. I'm Santi, walking us through."

---

## Slide 2 · TL;DR — Eric's question (1-2 min) **THE OPENING**

> "Eric — you asked two days ago if we had results from the experiment. The short answer is yes. Four findings."

Read the 4 highlights briefly. If Eric asks for detail, say "let's go through each — it's the rest of the deck."

**Don't oversell.** "Yes — we have results" is the message. The number, the wrinkle, the SRM, the funnel win — all at once, not buried.

---

## Slide 3 · Hito (~30 sec) **CREDIBILITY**

> "Quick context before data. The Onboarding squad formed 50 days ago. We started this work 30 days ago. Today we're at 50% rollout, 100% tomorrow. This is a small-team experiment within Squire — the team exists to ship fast. This was its first proof point."

Mention 2 platforms shipped in parallel + 9 events with byte-for-byte parity (proof of quality, not just speed).

---

## Slide 4 · Per-exposure rates (1-2 min) **THE WRINKLE**

> "First nuance. Normalized per device, Flow A has 9.1% barber signups via the signup path, Flow B has 14.3% — 57% higher. This is counterintuitive: if the experiment is redirecting invited barbers to login, this number should be lower in B, not higher."

**Be ready to explain:** "We count barber-type accounts created via signup_link in Flow A or email_not_found in Flow B. We can't claim they're 'accidental' without user research — they could be legit new barbers OR existing barbers who didn't know they had an account. What's worth surfacing: the rate per device is higher in B, which is the direction we'd want reversed if the experiment is working."

**Caveats to volunteer:** small sample, ramp at <50% most of the period, not declaring a winner.

---

## Slide 5 · Funnel (1 min) **GOOD NEWS #1**

> "Other side. Flow B converts BETTER. Welcome rate 99.6% vs 85.6%. Login conversion 67.5% vs 58.7%. Email-first doesn't break login — it improves it by 9 percentage points."

Walk through Data → Meaning → Conclusion. The conclusion in green: **"Email-first does NOT break login — it improves it. Strong guardrail signal."**

This is also our **overall_login_success_rate guardrail** from Tristan's analytics plan — call it out: *"and this is the guardrail metric we committed to in the Confluence plan."*

---

## Slide 6 · Email check (1-2 min) **THE MONEY SIGNAL**

> "Why Flow B works conceptually. When a user types their email, 33.5% are temp_password — invited barbers we're catching before they touch Sign Up. Without Flow B, those users would create duplicate Indie accounts."

Slow down here. This is the most quotable slide. Say "33.5% temp_password" twice if needed.

---

## Slide 7 · Variant balance (~1 min) **THE HONESTY**

> "There's a real Sample Ratio Mismatch. We expected 50/50, observe 63/37. Tristan and I are investigating root cause this week."

Show both donuts (LD vs Snowflake). Read the SRM definition card briefly: "when actual deviates from expected." Don't dwell — flag and move on.

---

## Slide 8 · Friction (~1 min)

> "Friction signals are comparable. The new thing in Flow B: 57 abandonment events at the email step — a step Flow A doesn't have. Worth watching but not alarming yet."

Mention the login_failed asymmetry as a known data quality issue (covered in next slide).

---

## Slide 9 · North star (~1 min) **HONEST ABOUT THE ZERO**

> "The primary north star — indie/signup_link — is at zero in both variants. This is NOT a null result. It's an instrumentation gap: probably the `account_type='indie'` property isn't emitting on creation. QA validates next week. Real reading next sync."

⚠️ Critical to lead with "instrumentation gap, not null result." A VP scanning a zero metric without context will think the experiment failed.

---

## Slide 10 · Caveats (~1 min)

> "Three things we're fixing this week. Indie property emission, login_failed asymmetry, and the SRM investigation."

Each caveat has a fix line — read it. Shows we know what to do.

---

## Slide 11 · Retrospective (~2 min)

> "How shipping this experiment felt. 30 days from go-decision, 2 platforms in parallel, 9 events identical."

Walk through wentWell quickly (4 items × ~10 sec each).

For slowedDown: **don't sound like excuses.** Each item has a Learning. Read the Learning line out loud — that's the takeaway, not the complaint.

---

## Slide 12 · Commitments (~2 min)

> "Three decisions we're making, plus 4 items in flight."

Click each checkbox as you go (the boxes are clickable).

- **D1 (Courses prototyping):** "Starting next week with Tristan. Flag if this conflicts with anything."
- **D2 (RN logins):** "In two weeks, parallel with Appointments team. When the winner is decided, RN is ready to ship."
- **D3 (RN coordinate):** "I need clarity from you and Yurii here — May 29 launch: full feature parity, or onboarding-only first?"

The 4 FYI items are status, not asks — just briefly mention.

---

## Slide 13 · Courses (~1-2 min)

> "Next project. Already kicked off pre-experiment. We take Tristan's existing Figma, feed it through Claude Design + DESIGN.md spec, iterate one course at a time, and coordinate timing with the RN launch."

Show the Figma screenshot. Mention the 3 tools briefly. The Claude Design mockup at the bottom shows what the workflow looks like visually.

---

## Slide 14 · Close (~30 sec)

> "That's it. Questions, course corrections, or pushback?"

---

## Things to **not** say

- Don't apologize for the SRM or the zero north star — they're caveats, not failures.
- Don't say "we hope" — say "we expect" or "the data shows."
- Don't ask permission for things the team has authority over (Courses prototyping, RN parallel build). These are decisions WE'RE making.
- Don't oversell the 33.5% — it's strong but it's one signal at <50% rollout. Honest > triumphant.

## Things to **lead with** if asked tough questions

- "What if Flow B is just worse?" → "Per-exposure says Flow B is currently worse on accidental signups. Per-funnel says Flow B is better on completion. We're not declaring a winner — we want full-rollout traffic + the SRM resolved before reading."
- "What does the 0 indie mean?" → "We believe instrumentation, not null. The barber/signup_link proxy gives us the same shape of signal."
- "Why is the SRM happening?" → "Hypotheses: bucketing logic, cached LD evaluations from before the experiment, non-uniform LD eval. Investigating with Tristan."

## Coverage check vs Confluence Analytics Plan

The plan defined **9 events + 1 derived guardrail metric**. Every one is in this deck:

| Plan item | Tier | Where in deck |
|---|---|---|
| `login_experiment_assigned` | Must Have | Slide 7 (Variant balance) |
| `welcome_screen_viewed` | Must Have | Slide 5 (Funnel — step 2) |
| `email_check_result` | Must Have | Slide 6 (Email check) |
| `login_succeeded` | Must Have | Slide 5 (Funnel — step 3) |
| `account_created` | Must Have | Slide 9 (North star) |
| `login_failed` (renamed) | Nice to Have | Slide 8 (Friction) + Slide 10 (caveat about asymmetry) |
| `forgot_password_tapped` | Nice to Have | Slide 8 (Friction) |
| `signup_link_tapped` | Nice to Have | Slide 10 (caveat about scope leak — diagnosed) |
| `login_abandoned` | Nice to Have | Slide 8 (Friction · iOS only) |
| `overall_login_success_rate` | **Guardrail** | Slide 5 (Funnel — labeled in eyebrow + currentRead) |

If Eric or Yurii ask "did you instrument what we agreed?" — yes, every event in the plan is on a slide.

## Reference

- [Confluence Analytics Plan](https://squire.atlassian.net/wiki/spaces/ST/pages/4687101960/Analytics+Plan)
- [SQR-6510 Jira ticket](https://squire.atlassian.net/browse/SQR-6510)
- [Figma · Soooooo Onboarding](https://www.figma.com/board/wwEiY53MIasNSEA4AfPkx2/Soooooo-Onboarding)
