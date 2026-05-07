# Onboarding Team Sync

Live, browser-based weekly deck for the Onboarding squad. Covers ship updates, the email-first login A/B test (SQR-6510), and what's coming next. Designed to be re-run every week — edit one JSON file, refresh the browser, present in Meet.

**Live**: https://santi-squire.github.io/onboarding-team-sync/

> For a stable, external-shareable version of just the A/B experiment results, see the sibling repo: https://github.com/santi-squire/email-first-login-report

---

## Run it locally

```bash
cd /Users/santianaya/code/onboarding-team-sync
python3 -m http.server 8080
```

Open `http://localhost:8080`.

> The deck uses `fetch()` to load weekly data — opening `index.html` directly via `file://` will fail. Use a local server.

Keyboard:
- `→ / ←` — next / previous slide
- `f` — fullscreen
- `s` — speaker notes view
- `Esc` — slide overview
- `?` — help

---

## Add a new week

1. Copy the most recent JSON snapshot:
   ```bash
   cp data/2026-05-06.json data/YYYY-MM-DD.json
   ```
2. Update the new file with this week's numbers (`weekOf`, `weekNumber`, `thisWeekShipped`, metric `currentRead` strings, chart data fields, `openIssues`, `nextWeek`).
3. Bump `CURRENT_WEEK` at the top of `script.js`:
   ```js
   const CURRENT_WEEK = "YYYY-MM-DD";
   ```
4. Refresh the browser.

The deck (cover, agenda, status, every metric slide, charts, blockers, next week) all read from that single JSON.

---

## Data shape (per week)

| Section | What goes here |
|---|---|
| `weekOf`, `weekNumber`, `presenter` | Cover slide metadata |
| `agenda` | Bullets shown on agenda slide |
| `thisWeekShipped` | `[{ title, detail }]` — what the team delivered this week |
| `experiment` | Static per experiment: problem, flowA, flowB, rollout, methodology, north star, threshold |
| `metrics` | Array of `{ id, eyebrow, title, definition, whyItMatters, watchFor, currentRead, chartType }` — per-metric explainer text. Update `currentRead` weekly with the latest interpretation |
| `variantBalance` | `{ launchDarkly: { flowA, flowB }, snowflake: null }` — fill `snowflake` when query runs |
| `funnel`, `northStarData`, `emailCheck`, `friction` | Chart data — set to `null` for "data pending" state, populate with the shape the renderer expects to show charts |
| `openIssues` | `[{ title, owner, status, severity }]` |
| `nextWeek` | Strings — what's next |

When a chart's underlying data is `null`, the slide renders a "data pending" state instead of a broken chart. Set the field to a real object when the data lands.

---

## Snowflake queries

`queries/` has paste-ready SQL for the Snowflake web UI. See `queries/README.md` for details. Run them, paste results back, and I'll fold them into the JSON.

---

## Project structure

```
onboarding-team-sync/
├── index.html        # slide DOM scaffold (reveal.js sections)
├── styles.css        # custom theme on top of reveal.js
├── script.js         # data loader + chart renderers + reveal init
├── data/
│   └── YYYY-MM-DD.json   # one snapshot per weekly meeting
├── queries/          # SQL for Snowflake
├── assets/           # images, screenshots (optional)
└── README.md
```

No build step, no `node_modules` — reveal.js + Chart.js + Inter font + JetBrains Mono load from CDN.

---

## Presenting in Google Meet

1. Start the local server (`python3 -m http.server 8080`).
2. Open the deck in a Chrome tab.
3. Press `f` to enter fullscreen, or share the tab in Meet.
4. Arrow keys to advance.

---

## Reference

- **Confluence Analytics Plan** — https://squire.atlassian.net/wiki/spaces/ST/pages/4687101960/Analytics+Plan
- **Jira** — [SQR-6510](https://squire.atlassian.net/browse/SQR-6510) (analytics implementation), SQR-5754 (epic), SQR-8989 (PostHog flag setup)
- **iOS PR #4138** — Title Case rename + collision fix
- **Source-of-truth principle** — RudderStack/Snowflake over LaunchDarkly when they disagree (per Yurii)
