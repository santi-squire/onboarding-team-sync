# Weekly Sync · May 13 · 10-min talking script

Read top-to-bottom while sharing screen. Each section is ~1-2 minutes.

---

## 0. Open · 30 sec

"This week I'm sharing the experiment status and one new framing for Eric. Then Tristan covers Courses, timeline, and the mobile-rebuild release plan."

---

## 1. Three things to know · 1 min · TL;DR strip

Just read the three cards aloud:

- The new experiment is working. Both A and B beat the old production login on the metrics that matter.
- Accidental signups are dropping fast. Confirmed by support tickets AND by our data, same direction.
- Mobile rebuild: auth is moving to Descope. Conclusions still apply.

---

## 2. The clean-data numbers · 2 min · Big numbers section

Four cards. Walk through left-to-right:

- **Traffic split 50.5 / 49.5.** The comparison is fair, no skew.
- **Completion gap +8pp.** 52% of Flow B users complete login vs 44% of Flow A. Flow B has been ahead every day since rollout (range 8 to 14pp).
- **Accidental signups −75%.** From ~12 / week before the deploy down to ~3 / week after.
- **Email step truly abandoned 33%.** Two thirds of users who pause at the email step come back later. Watching the third that doesn't.

Sample is 771 devices and growing 20-25% per day.

---

## 3. Eric's framing: pre-experiment vs experiment · 2 min · New flow vs old flow section

**This is the most important section for Eric. Don't skip the methodology line.**

"This view ignores the A/B split. We compare the population on the old production login (16 weeks before Apr 30) to the population on the new experiment (since Apr 30, Flow A or Flow B)."

Walk through the two cards:

- Pre-experiment: ~12 / week, 16 full weeks (Jan 5 → Apr 26). 3 accidental cancellations in April from support tickets.
- Experiment: ~3 / week. 0 accidental cancellations in May.

Then the bar chart:

"This is each week, January through May. Red is pre-experiment, green is experiment. The orange line is the Apr 30 deploy. You can see the pre-experiment baseline is stable, between 7 and 22 per week, for the whole year-to-date. Then at the deploy, it drops."

**How we count an accidental signup** (Eric will ask if I don't say it):

"A new solo-barber account whose email already belongs to a barber attached to a shop. If the same email is in both places, it's almost certainly a duplicate — the barber didn't realize they already had an account through their shop."

**Support tickets** (this is the ground-truth):

"Support tags every cancellation ticket with a reason. One tag is 'Accidental Indy Self-Signup'. In April there were 3 tickets with that tag. In the first 11 days of May there were zero. May had 6 total cancellations but none were tagged accidental — they were Training, Out of Business, or no reason given."

---

## 4. Tristan's question: the two rows where Flow A looks better · 2 min · Scorecard callout

**This is for Tristan. He asked yesterday.**

"Two rows in the scorecard show Flow A with a better number. Neither is a real user win:"

- **Abandons per 100 devices.** Flow A has one screen to abandon, Flow B has two (email step then password step). So B fires more abandon events. That's mechanics, not user dissatisfaction. We traced them — 67% of Flow B abandoners come back and finish later.
- **New barber signups per device.** Flow B produces more raw signups (9.8% vs 7.2%). But the rate of accidental signups inside that group is down 75%. More signups, fewer duplicates. The ones it catches look like genuine new barbers.

The rest of the scorecard goes to Flow B: completion (+8pp), welcome rate (+10pp), forgot-password (−9pp), and the duplicate-prevention signal.

---

## 5. What's next · 1 min · Next steps

- iOS 3.23.1 release today fixes a bucketing bug.
- Microsoft Clarity install with Yurii: deploys today. Will record sessions and show what users do at the email step.
- Confirming with Eric and Tristan that "reducing accidental signups" is the agreed success metric.
- Coordinating with mobile-rebuild team on configuring Descope as Flow B.

---

## 6. Hand to Tristan

"That's the metrics side. Tristan, over to you for Courses + timeline."
