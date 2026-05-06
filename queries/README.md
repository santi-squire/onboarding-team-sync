# Snowflake Queries — Onboarding Login A/B (SQR-6510)

Five paste-ready queries against `RAW.RUDDER_EVENTS` to populate the weekly deck.

## Run order

1. `01-variant-balance.sql` — fills `variantBalance.snowflake` in the data JSON
2. `02-funnel.sql` — fills `funnel`
3. `03-north-star.sql` — fills `northStarData`
4. `04-email-check.sql` — fills `emailCheck`
5. `05-friction.sql` — fills `friction` (and includes a sanity check for `SIGNUP_LINK_TAPPED`)

## Caveats

- Filter on `VARIANT IN ('flowA', 'flowB')` is intentional — pre-experiment events don't carry the variant property and we want to isolate the post-deploy population.
- `LOGIN_FAILED` table currently mixes legacy `Login failed` (iOS) and the renamed `Login attempt failed` until iOS PR #4138 fully ramps up. Until then, treat raw counts in that table as legacy-dominated; the variant filter pulls out the experiment-scoped rows.
- All queries default to `TIMESTAMP >= '2026-04-30'` — the prod deploy date. Adjust if you want a tighter window.
- Column names assume RudderStack's standard flattening of event properties to top-level columns (`VARIANT`, `RESULT`, `ACCOUNT_TYPE`, etc.). If your warehouse keeps them nested under `CONTEXT` or a JSON column, adapt the column refs.

## Updating the deck after running

Once you have results, paste them to me and I'll fold them into `data/YYYY-MM-DD.json`:

- `variantBalance.snowflake = { flowA: <N>, flowB: <N> }`
- `funnel = { steps: [...], flowA: [...], flowB: [...] }`
- `northStarData = { dates: [...], flowA: [...], flowB: [...] }` — for time series, otherwise drop in raw counts
- `emailCheck = { returning, temp_password, new_user }`
- `friction = { events: [...], flowA: [...], flowB: [...] }`

Refresh the browser → charts render automatically.
