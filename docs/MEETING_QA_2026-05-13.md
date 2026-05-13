# Weekly Sync · May 13 · Anticipated Q&A

Skim before the meet. Have the numbers in your head, not on a search.

---

## Eric — non-technical, wants the new-vs-old story

**Q: How are we sure the drop isn't just fewer users overall?**
A: User base grew about 5% in the experiment window (849k devices/wk pre vs 890k post). So the drop is real, not "fewer users". If anything it's understated.

**Q: Why did you pick those baseline weeks?**
A: We picked the 16 full weeks before the deploy (Jan 5 → Apr 26). That's the whole year-to-date. The pattern is stable, between 7 and 22 accidental signups per week. No underlying downward trend, so the drop at the deploy is from the new experience, not natural decay.

**Q: Can we go further back?**
A: Yes, easily. The data is there. The stable pattern would just keep going. Happy to extend if it helps tell the story.

**Q: How exactly do we identify an "accidental signup"?**
A: A new solo-barber account whose email already belongs to a barber who's attached to a shop. The same email in both places almost always means the barber didn't realize they already had an account through their shop and signed up again by mistake.

**Q: What's the difference between the support data and your data?**
A: Two independent signals.
- Support tickets are direct: when a user contacts CS to cancel a duplicate, the ticket gets tagged "Accidental Indy Self-Signup". 3 in April, 0 in May.
- Our data is broader. It catches every likely duplicate, not just the ones who complain to support.
Both move in the same direction. Support is the cleanest, our data is the volume read.

**Q: Why was the rate so high in April pre-experiment (80-90%)?**
A: Smaller indie volume in those weeks, so the ones that were created were mostly duplicates. The absolute count was still in the 11-15 range. Look at the bar chart — the count is what dropped sharply at deploy.

**Q: Are there any caveats I should know?**
A: Yes — Apr 27 week straddles the deploy day. Some of the data in that week is still old flow. Even so, the post-deploy weeks average 3 / week vs 12 / week pre.

---

## Tristan — engaged, asks about scorecard

**Q: Why is Flow B losing the abandons row?**
A: Mechanics. Flow A has one screen to abandon (combined email+password). Flow B has two (email step, then password step). B fires more abandon events because it has more places to abandon. Not a UX issue. We checked — 67% of B abandoners return later, only 33% are truly lost.

**Q: Why is Flow B losing the per-exposure signup row?**
A: Flow B produces more raw barber signups (9.8% vs 7.2%). But the rate of accidental signups inside that group is down 75% on the new flow. So Flow B has more total signups but fewer of them are duplicates. The ones it catches look like genuine new barbers, not invited shop barbers re-signing.

**Q: Is the completion gap shrinking? You showed +14pp Tuesday and now +8pp.**
A: That's cohort maturation. Users assigned to Flow A who were mid-flow on Tuesday have now finished login. Both flows gain completers as the cohort ages. Flow B has stayed ahead every day, by 8 to 14pp. Story holds.

**Q: How does this map to Descope?**
A: Descope can be configured as either flow. We recommend matching it to Flow B since that's where the experiment lands. Tristan's input on visual styling is needed; I handle the functional configuration.

**Q: What about Welcome rate showing 101% for Flow B?**
A: Harmless data quirk. Some devices got assigned during the early-ramp days but only triggered their first activity later, after the full rollout. They show up as welcome-viewers in this slice without the matching assignment event. Doesn't change the direction.

---

## Yurii — direct, cost / pace focused

**Q: When does the next iOS deploy ship?**
A: 3.23.1 deploys today. Includes the scope-leak fix.

**Q: Is Clarity ready to record on iOS?**
A: Deploying today on your side. Once it's recording, we can finally see what the email-step abandoners are doing.

**Q: What's the mobile-rebuild team waiting on from this experiment?**
A: A clear "configure Descope as Flow B" decision, plus visual treatment from Tristan. The functional config is on my side.

**Q: Realistic ETA on stable Descope login?**
A: Depends on Tristan's design pace on the four onboarding courses, which is the bigger blocker. Will know more from Tristan's section in this meeting.

---

## If asked about the experiment outcome

**Q: Are we calling it for Flow B?**
A: Both options work. Within the experiment Flow B wins on the metrics that matter — completion, welcome rate, forgot-password, and most importantly accidental signups. So recommendation is Flow B.

**Q: What's the risk of calling it now?**
A: Sample size is 771 devices on the clean slice and growing 20-25% per day. The duplicate-prevention signal is the strongest — confirmed by two independent sources (support + our data). The conversion-gap signal is narrowing as cohorts mature but still meaningfully in B's favor. Calling it now is reasonable; another week would only sharpen it.

**Q: What does "calling it" mean in practice?**
A: Tell the mobile-rebuild team to configure Descope as Flow B. The experiment infrastructure stays in place if we ever want to reopen it.

---

## Numbers cheat-sheet

- Sample (today): 771 devices on clean slice (was 633 yesterday)
- Completion: Flow B 52% / Flow A 44% / gap +8pp (range 8-14pp since rollout)
- Welcome reach: Flow B 101% / Flow A 92% / gap +10pp
- Forgot-password / device: Flow A 30% / Flow B 22% / gap −9pp (B wins)
- Abandons / 100 devices: Flow A 33 / Flow B 52 / mechanics (B has 2 surfaces)
- New barber signup / device: Flow A 7.2% / Flow B 9.8% / B has more raw, fewer duplicates
- temp_password catch: Flow B 28% (catches ~1 in 4 invited barbers before duplicate)
- Accidental signups: ~12/wk before deploy (16-week baseline) → ~3/wk since (3 weeks)
- Support tickets: 3 accidental cancellations in April → 0 in May
- User base: +5% in window, so drop isn't fewer users
