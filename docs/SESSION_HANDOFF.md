# Session Handoff — Snowflake MCP + Analytics

**Last updated**: 2026-05-08
**Session ended at**: ~70% complete on Snowflake MCP setup, 100% complete on weekly deck + experiment report.

---

## TL;DR — where we are

**Done**:
- ✅ Weekly deck (`onboarding-team-sync` repo) live at https://santi-squire.github.io/onboarding-team-sync/
- ✅ External report (`email-first-login-report` repo) live at https://santi-squire.github.io/email-first-login-report/
- ✅ iOS PR for `signup_link_tapped` scope leak: [PR #4143](https://github.com/squire-technologies/ios-commander/pull/4143) and release branch [PR #4144](https://github.com/squire-technologies/ios-commander/pull/4144)
- ✅ All 8 Snowflake queries executed and integrated into the deck
- ✅ Squire marketplace plugins installed (pm-tools, engineering-tools, design-tools, qa-tools, skill-dev)
- ✅ `snowflake-cortex-code` plugin installed
- ✅ `snow` + `cortex` CLIs installed (via `snowflake-ai-kit/install.sh`)
- ✅ Snowflake config at `~/.snowflake/config.toml`
- ✅ RSA key pair generated at `~/.snowflake/keys/`

**Pending**:
- 🔴 Snowflake auth blocked — externalbrowser SSO loops, key-pair pending admin (Denis K) registering public key
- 🟡 PR #4143 / #4144 awaiting Yurii review + merge + 3.23.1 release
- 🟡 First weekly cycle with full-rollout (May 7+) data — to be done next week with fresh queries

---

## How to resume Snowflake MCP setup next session

### Option 1: Key-pair auth (recommended, blocked on admin)

1. **Check if Denis K ran the ALTER USER** I sent in Slack. If yes:
   ```bash
   # Switch config back to JWT
   cat > ~/.snowflake/config.toml <<'EOF'
   default_connection_name = "default"

   [connections.default]
   account = "mhazqgd-dja79986"
   user = "C_SANTIAGO_ANAYA"
   authenticator = "SNOWFLAKE_JWT"
   private_key_file = "/Users/santianaya/.snowflake/keys/snowflake_key.pem"
   role = "FULL_READ_ACCESS"
   warehouse = "COMPUTE_WH"
   database = "RAW"
   schema = "RUDDER_EVENTS"
   EOF

   snow connection test --connection default
   ```

2. **If success**: register the snow MCP in Claude
   ```bash
   claude mcp remove snowflake 2>/dev/null
   # The cortex plugin handles snow CLI usage automatically — no MCP add needed.
   # Test by asking Claude: "What tables are in RAW.RUDDER_EVENTS?"
   ```

### Option 2: Try fixing externalbrowser SSO again

If Denis hasn't responded:
- Try Safari browser instead of Chrome
- Try Chrome incognito
- Manual paste of SSO URL after Ctrl+C

### Option 3: Plain Bash with `snow` CLI

If MCP setup keeps being a problem, just use Bash from Claude:
```bash
snow sql -q "SELECT VARIANT, COUNT(*) FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED WHERE TIMESTAMP >= '2026-04-30' GROUP BY VARIANT" --connection default
```

Claude can pipe through Bash tool. Less elegant but reliable once auth works.

### Option 4: Chrome DevTools MCP — fallback if Snowflake auth keeps blocking

If `snow` auth is permanently stuck, this lets Claude **read your Snowsight web UI directly** — you stay logged in via SSO in Chrome (which already works for you), and Claude reads the query results from the rendered page. No Snowflake auth needed on Claude's side.

#### Install (single message in next session)

```bash
# Install the MCP package globally via npm
npm install -g chrome-devtools-mcp

# Register it with Claude (single-line, no backslashes — zsh quirk)
claude mcp add chrome --scope user -- npx -y chrome-devtools-mcp@latest
```

#### Start Chrome with debugging port (one-time setup)

The MCP attaches to your existing Chrome via the DevTools Protocol. You need to launch Chrome with the debugging port exposed.

Add an alias to `~/.zshrc`:
```bash
alias chrome-debug='/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=$HOME/.chrome-mcp-profile &'
```

Then:
```bash
source ~/.zshrc
chrome-debug
```

That opens Chrome with a SEPARATE profile (`.chrome-mcp-profile`) on port 9222. **Log into Snowsight** in this Chrome instance once — cookies persist in that profile.

#### How to use

In a Claude session:
```
"Open https://app.snowflake.com in Chrome and run this query, then read the results back:
SELECT VARIANT, COUNT(*) FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED ..."
```

Claude → uses chrome-devtools MCP → opens tab → pastes SQL into Snowsight worksheet → reads grid → returns results.

#### Tradeoffs vs Snowflake MCP

| | Snowflake MCP (preferred) | Chrome DevTools MCP (fallback) |
|---|---|---|
| Auth | Needs key-pair (admin step) | Uses your existing Snowsight login |
| Speed | Direct SQL, fast | Slower (browser automation) |
| Reliability | Once auth works, rock solid | Brittle to UI changes |
| Setup complexity | High (this whole saga) | Low (3 commands) |
| Multi-tasking | Can run while you do other things | Browser is "in use" while Claude works |

#### Recommended order in next session

1. **First** — check if Denis ran the ALTER USER. If yes → Option 1 (key-pair).
2. **If still blocked** — install Chrome DevTools MCP per this section.
3. **Use Chrome MCP for queries** until Snowflake auth gets resolved.
4. **Eventually** switch to Snowflake MCP when auth works (faster + cleaner).

Both can coexist — you can have BOTH MCPs registered. Claude picks the appropriate one per task.

---

## The 8 queries we run weekly + why

All target the SQR-6510 login A/B experiment. Run with `WHERE VARIANT IN ('flowA','flowB')` and `WHERE TIMESTAMP >= '<start of week>'`.

### Query 1 — Variant balance (anonymous_id)
```sql
SELECT
  VARIANT,
  COUNT(DISTINCT ANONYMOUS_ID) AS distinct_devices,
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)) AS distinct_actors,
  COUNT(*) AS total_events,
  ROUND(100.0 * COUNT(DISTINCT ANONYMOUS_ID)
        / SUM(COUNT(DISTINCT ANONYMOUS_ID)) OVER (), 2) AS pct_devices
FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA', 'flowB')
GROUP BY VARIANT
ORDER BY VARIANT;
```
**Purpose**: SRM check. Should be ~50/50. We observed 63/37.

### Query 2 — Funnel (consistent ANONYMOUS_ID across all 3 steps)
```sql
WITH steps AS (
  SELECT 'a_assigned' AS step, VARIANT, ANONYMOUS_ID
  FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED
  WHERE TIMESTAMP >= '2026-04-30' AND VARIANT IN ('flowA','flowB')
  UNION ALL
  SELECT 'b_welcome', VARIANT, ANONYMOUS_ID
  FROM RAW.RUDDER_EVENTS.WELCOME_SCREEN_VIEWED
  WHERE TIMESTAMP >= '2026-04-30' AND VARIANT IN ('flowA','flowB')
  UNION ALL
  SELECT 'c_succeeded', VARIANT, ANONYMOUS_ID
  FROM RAW.RUDDER_EVENTS.LOGIN_SUCCEEDED
  WHERE TIMESTAMP >= '2026-04-30' AND VARIANT IN ('flowA','flowB')
)
SELECT VARIANT, step,
       COUNT(DISTINCT ANONYMOUS_ID) AS distinct_devices,
       COUNT(*) AS total_events
FROM steps
GROUP BY VARIANT, step
ORDER BY VARIANT, step;
```
**Purpose**: Login completion guardrail (`overall_login_success_rate`). Conversion = succeeded ÷ welcome.

### Query 3 — North star (account creation breakdown)
```sql
SELECT
  VARIANT, ACCOUNT_TYPE, CAME_FROM,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.ACCOUNT_CREATED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA','flowB')
GROUP BY VARIANT, ACCOUNT_TYPE, CAME_FROM
ORDER BY VARIANT, ACCOUNT_TYPE, CAME_FROM;
```
**Purpose**: Indie via signup_link is THE primary metric. Currently 0 in both variants — instrumentation gap to validate with QA.

### Query 4 — Email check distribution (Flow B only)
```sql
SELECT
  RESULT, INPUT_TYPE,
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)) AS distinct_users,
  COUNT(*) AS total_events,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM RAW.RUDDER_EVENTS.EMAIL_CHECK_RESULT
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT = 'flowB'
GROUP BY RESULT, INPUT_TYPE
ORDER BY total_events DESC;
```
**Purpose**: The "money signal". 33.5% temp_password = catching invited barbers. Flow B exclusive.

### Query 5a — Login failed by reason
```sql
SELECT
  VARIANT, REASON,
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.LOGIN_FAILED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA','flowB')
GROUP BY VARIANT, REASON
ORDER BY VARIANT, total_events DESC;
```
**Purpose**: Failure reasons. We discovered Flow A absence is due to legacy app versions (3.16.4-3.22.0) not emitting variant property.

### Query 5b — Forgot password by state
```sql
SELECT
  VARIANT, FROM_STATE,
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.FORGOT_PASSWORD_TAPPED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA','flowB')
GROUP BY VARIANT, FROM_STATE
ORDER BY VARIANT, total_events DESC;
```
**Purpose**: Forgot password as friction signal. Flow A had high counts (196 events) — finding: frustration tapping pattern from non-dismissible sheet.

### Query 5c — Login abandoned by step
```sql
SELECT
  VARIANT, LAST_STEP_REACHED,
  COUNT(DISTINCT COALESCE(USER_ID, ANONYMOUS_ID)) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.LOGIN_ABANDONED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA','flowB')
GROUP BY VARIANT, LAST_STEP_REACHED
ORDER BY VARIANT, total_events DESC;
```
**Purpose**: Where users drop off. Found 57 events at the new email_entry step in Flow B.

### Query 6 — Sanity: signup_link_tapped scope leak
```sql
SELECT
  ANONYMOUS_ID, COALESCE(USER_ID, 'anon') AS user_id,
  TIMESTAMP, CONTEXT_APP_VERSION, VARIANT
FROM RAW.RUDDER_EVENTS.SIGNUP_LINK_TAPPED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT = 'flowB'
ORDER BY TIMESTAMP;
```
**Purpose**: Discovered scope leak — 5 events from 3 iOS devices on v3.23.0. Root caused. Fix in PR #4143.

### Query A — Indie validation
```sql
SELECT ACCOUNT_TYPE, COUNT(*) AS total_events,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  MIN(TIMESTAMP) AS first_seen, MAX(TIMESTAMP) AS last_seen
FROM RAW.RUDDER_EVENTS.ACCOUNT_CREATED
WHERE TIMESTAMP >= DATEADD(day, -60, CURRENT_DATE())
GROUP BY ACCOUNT_TYPE
ORDER BY total_events DESC;
```
**Purpose**: Validates if the `account_type='indie'` property emits at all. Found: 73 barber + 2 shop + 0 indie in 7 days. Inconclusive — needs QA validation.

### Query B — Login_failed by app version
```sql
SELECT CONTEXT_APP_VERSION, VARIANT, COUNT(*) AS events
FROM RAW.RUDDER_EVENTS.LOGIN_FAILED
WHERE TIMESTAMP >= '2026-04-30'
GROUP BY CONTEXT_APP_VERSION, VARIANT
ORDER BY CONTEXT_APP_VERSION DESC, VARIANT;
```
**Purpose**: Confirms login_failed asymmetry — versions <3.23.0 don't emit variant property.

---

## Current week's data (week of 2026-05-06)

| Metric | Flow A | Flow B |
|---|---|---|
| **Variant balance (devices)** | 418 (63%) | 244 (37%) — SRM real |
| **Funnel** | 418 → 358 → 210 (welcome 85.6%, conv 58.7%) | 244 → 243 → 164 (welcome 99.6%, conv 67.5%) |
| **Account created (barber/signup_link)** | 38 | 0 |
| **Account created (barber/email_not_found)** | 0 | 35 |
| **Indie/signup_link** | 0 | 0 (instrumentation gap) |
| **Email check temp_password** | n/a | 33.5% (the headline) |
| **Login failed events** | 0 (legacy versions filtered) | 14 |
| **Forgot password events** | 196 (frustration tapping) | 59 |
| **Login abandoned events** | 202 (password) | 180 (123 password + 57 NEW email) |
| **Per-exposure barber signup rate** | 9.1% (38/418) | 14.3% (35/244) |

---

## Pending follow-ups

1. **Re-pull all metrics** post-100% rollout (May 7+). Will need 7 days of full traffic.
2. **Pre-experiment baseline comparison**: pull legacy login funnel for 7 days BEFORE Apr 30. Tristan's plan called for this.
3. **QA validation of indie property emission**: confirm the property fires when an Indie account is created.
4. **Investigate SRM root cause**: bucketing logic, cached pre-experiment exposures, or non-uniform LD evaluation. With Tristan.
5. **Fix scope leak ship**: PR #4143 / #4144 needs Yurii review + 3.23.1 release.
6. **Audit login_failed Flow A handler** in 3.23.0 — 100 events fire with variant=null.

---

## Setup that's saved on disk

- `~/.snowflake/config.toml` — connection config (currently externalbrowser, can switch to JWT)
- `~/.snowflake/keys/snowflake_key.pem` — RSA private key (chmod 600)
- `~/.snowflake/keys/snowflake_key.pub` — RSA public key (already shared with Denis)
- `~/.claude.json` — has snowflake MCP entry registered (currently unhealthy until auth works)
- Squire marketplace plugins installed (5 plugins, see /plugin list)
- `~/snowflake-ai-kit/` — cloned repo with snow + cortex CLIs

## What works without Snowflake MCP

Even if Snowflake stays blocked, you can still:
- Update the deck with manually-pasted query results (the original workflow)
- Iterate on slides, fix bugs, polish
- Push deck updates to GitHub Pages

The MCP just removes the manual paste-back step — it's a productivity boost, not a blocker.

---

## First-message-of-next-session checklist

When you start the next session, ask Claude:

```
Read docs/SESSION_HANDOFF.md. Two parallel paths:

A) If Denis ran the ALTER USER → switch config to JWT, test, register Snowflake MCP.
B) If Denis hasn't responded → install Chrome DevTools MCP (Option 4 in handoff) so I can use Snowsight via browser. Less elegant but unblocks me.

Pick the one that's ready. Tell me the concrete commands to run.
```

That gives the new session enough context to execute either path immediately without re-debugging.

## Quick-start: Chrome DevTools MCP only (skip Snowflake entirely)

If you just want to get unblocked TODAY without waiting for Denis:

```bash
# 1. Install
npm install -g chrome-devtools-mcp

# 2. Register
claude mcp add chrome --scope user -- npx -y chrome-devtools-mcp@latest

# 3. Add Chrome alias (one time)
echo 'alias chrome-debug='"'"'/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=$HOME/.chrome-mcp-profile &'"'"'' >> ~/.zshrc
source ~/.zshrc

# 4. Open Chrome (do this once per day)
chrome-debug
# → in that Chrome window, log into Snowsight ONCE

# 5. Restart Claude Code so the new MCP loads
```

After restart, ask Claude:
```
Use the chrome MCP to navigate to app.snowflake.com and verify I'm logged in.
```

If yes — done. From there, you ask Claude to run any query via the Snowsight UI.
