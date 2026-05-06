-- ===========================================================
-- Query 2: Login Conversion Funnel by Variant
-- Purpose: verify neither flow is breaking login for real users.
-- Output: per variant — assigned, welcome_viewed, login_succeeded
--         counts (distinct users) and conversion rate.
-- ===========================================================

WITH assigned AS (
  SELECT VARIANT, USER_ID
  FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED
  WHERE TIMESTAMP >= '2026-04-30'
    AND VARIANT IN ('flowA', 'flowB')
),
welcome AS (
  SELECT VARIANT, USER_ID
  FROM RAW.RUDDER_EVENTS.WELCOME_SCREEN_VIEWED
  WHERE TIMESTAMP >= '2026-04-30'
    AND VARIANT IN ('flowA', 'flowB')
),
succeeded AS (
  SELECT VARIANT, USER_ID
  FROM RAW.RUDDER_EVENTS.LOGIN_SUCCEEDED
  WHERE TIMESTAMP >= '2026-04-30'
    AND VARIANT IN ('flowA', 'flowB')
)
SELECT
  a.VARIANT,
  COUNT(DISTINCT a.USER_ID) AS users_assigned,
  COUNT(DISTINCT w.USER_ID) AS users_welcome_viewed,
  COUNT(DISTINCT s.USER_ID) AS users_login_succeeded,
  ROUND(
    100.0 * COUNT(DISTINCT s.USER_ID)
    / NULLIF(COUNT(DISTINCT w.USER_ID), 0),
    2
  ) AS conversion_pct
FROM assigned a
LEFT JOIN welcome w
  ON a.USER_ID = w.USER_ID AND a.VARIANT = w.VARIANT
LEFT JOIN succeeded s
  ON a.USER_ID = s.USER_ID AND a.VARIANT = s.VARIANT
GROUP BY a.VARIANT
ORDER BY a.VARIANT;

-- Watch for: Flow B should not lose more than 10% completion
-- vs Flow A. Bigger gap means email-first friction outweighs
-- the benefit.
