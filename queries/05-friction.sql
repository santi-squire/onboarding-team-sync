-- ===========================================================
-- Query 5: Friction Signals
-- Purpose: surface UX problems we wouldn't see in completion
-- rates alone — failed login reasons, forgot-password tap rate
-- by state, abandonment by step.
-- Output: 3 separate result sets, one per event family.
-- ===========================================================

-- ---------- 5a) Login attempt failed by reason ----------
-- NOTE: iOS rename to "Login attempt failed" (PR #4138) is in
-- release-3.23.0; until full prod rollout the new event still
-- lands in LOGIN_FAILED mixed with the legacy event. Filter on
-- VARIANT IS NOT NULL to isolate experiment events.
SELECT
  VARIANT,
  REASON,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.LOGIN_FAILED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA', 'flowB')
GROUP BY VARIANT, REASON
ORDER BY VARIANT, total_events DESC;

-- Once Android renames + iOS hits 100% rollout, switch this to:
-- FROM RAW.RUDDER_EVENTS.LOGIN_ATTEMPT_FAILED

-- ---------- 5b) Forgot password by state ----------
SELECT
  VARIANT,
  FROM_STATE,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.FORGOT_PASSWORD_TAPPED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA', 'flowB')
GROUP BY VARIANT, FROM_STATE
ORDER BY VARIANT, total_events DESC;

-- Watch: high forgot_password rate from Flow B / temp_password
-- users = invite email copy isn't making the temp password clear.

-- ---------- 5c) Login abandoned by step (iOS only) ----------
SELECT
  VARIANT,
  LAST_STEP_REACHED,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.LOGIN_ABANDONED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA', 'flowB')
GROUP BY VARIANT, LAST_STEP_REACHED
ORDER BY VARIANT, total_events DESC;

-- Watch: Flow B abandonment at email_entry = email-first
-- friction is higher than expected. Android skips this event
-- (MVU lifecycle limitation), so this is iOS-only.

-- ---------- 5d) Sanity: signup_link tapped (should be Flow A only) ----------
SELECT
  VARIANT,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.SIGNUP_LINK_TAPPED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA', 'flowB')
GROUP BY VARIANT
ORDER BY VARIANT;

-- Expectation: only flowA rows. Any flowB row indicates the
-- event is firing in the wrong scope.
