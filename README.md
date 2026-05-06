# Email-First Login A/B — Weekly Analysis

Live, browser-based slide deck for the weekly analysis of the Email-First Login A/B experiment (SQR-6510). Built to be re-run every week with fresh data — edit a JSON file, refresh the browser, present.

---

## Run it locally

```bash
cd /Users/santianaya/code/email-first-login-analysis
python3 -m http.server 8080
```

Open `http://localhost:8080`.

> The deck uses `fetch()` to load weekly data — opening `index.html` directly via `file://` will fail. You need a local server.

Keyboard navigation:
- `→ / ←` — next / previous slide
- `f` — fullscreen
- `s` — speaker notes view
- `?` — keyboard help

---

## Add a new week

1. Copy the most recent JSON snapshot:
   ```bash
   cp data/2026-05-06.json data/YYYY-MM-DD.json
   ```
2. Update the new file with this week's numbers (`weekOf`, `weekNumber`, `daysSinceDeploy`, `dataSource`, `headline`, `thisWeekShipped`, etc.).
3. Bump `CURRENT_WEEK` at the top of `script.js`:
   ```js
   const CURRENT_WEEK = "YYYY-MM-DD";
   ```
4. Refresh the browser.

That's it. Every section (cover, status, charts, issues, next-week list) reads from that single JSON.

---

## Data shape (per week)

| Field | What goes here |
|---|---|
| `weekOf` | ISO date of the Monday of the week being reported |
| `weekNumber` | Week count since experiment start |
| `daysSinceDeploy` | Days since prod deploy date |
| `dataSource` | One-liner describing where the numbers come from |
| `headline` | Single-sentence summary that opens the status slide |
| `thisWeekShipped` | Array of `{ title, detail }` — what the team delivered this week |
| `experimentMeta` | Static-ish: `northStar`, `primaryMetric`, `successThreshold`, `flows` |
| `events` | Array of the 9 instrumented events `{ name, scope, purpose, tier }` |
| `variantBalance` | `{ expected, launchDarkly, snowflake }` — `snowflake` can be `null` |
| `funnel` | `{ steps, flowA, flowB }` or `null` while data pending |
| `northStarData` | `{ dates, flowA, flowB }` time-series, or `null` |
| `sanityChecks` | Map of event-name → `{ flowA, flowB, status }`, or `null` |
| `openIssues` | Array of `{ title, owner, status, blocking }` |
| `nextWeek` | Array of strings — what's coming up |

When a chart's underlying data is `null`, the slide renders a "data pending" state instead of a broken chart. Set the field to a real object when the data lands.

---

## Project structure

```
email-first-login-analysis/
├── index.html        # slide DOM scaffold (reveal.js sections)
├── styles.css        # custom theme on top of reveal.js
├── script.js         # data loader + chart renderers + reveal init
├── data/
│   └── YYYY-MM-DD.json   # one snapshot per weekly meeting
├── assets/           # images, screenshots (optional)
└── README.md
```

No build step, no `node_modules` — reveal.js and Chart.js load from a CDN.

---

## Presenting in Google Meet

1. Start the local server (`python3 -m http.server 8080`).
2. Open the deck in a Chrome tab.
3. Press `f` to enter fullscreen, or just share the tab in Meet.
4. Use arrow keys to advance.
5. `Esc` shows the slide overview.

---

## Reference

- **Confluence** — [Email-First Login A/B — Analytics Plan](https://squire.atlassian.net/wiki/spaces/ST/pages/4687101960/Analytics+Plan)
- **Jira** — SQR-6510 (analytics implementation), SQR-5754 (experiment epic), SQR-8989 (PostHog flag setup)
- **iOS PR #4138** — Title Case rename + collision fix
- **Source-of-truth principle** — RudderStack/Snowflake over LaunchDarkly when they disagree (per Yurii)
