-- ===========================================================
-- Query 3: North Star — Indie Account Signups via signup_link
-- Purpose: the metric the experiment exists to move.
-- Output: per variant + breakdown across account_type and came_from
--         (so we can see both the headline number and the underlying
--          shape of where signups come from).
-- ===========================================================

-- Headline: indie via signup_link, by variant
SELECT
  VARIANT,
  ACCOUNT_TYPE,
  CAME_FROM,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_events
FROM RAW.RUDDER_EVENTS.ACCOUNT_CREATED
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT IN ('flowA', 'flowB')
GROUP BY VARIANT, ACCOUNT_TYPE, CAME_FROM
ORDER BY VARIANT, ACCOUNT_TYPE, CAME_FROM;

-- Pre-commit success bar: ≥30% reduction in indie/signup_link in
-- Flow B vs Flow A, AND login completion in Flow B not down
-- by more than 10% vs Flow A.

-- ---------- Optional: pre-experiment baseline ----------
-- This compares the new flow's indie signups against pre-experiment
-- volume (no variant set, before April 30).
-- Useful for the methodology note: "no in-experiment control,
-- compare against pre-experiment data at the reporting layer".
SELECT
  CASE
    WHEN TIMESTAMP < '2026-04-30' THEN 'pre-experiment'
    ELSE COALESCE(VARIANT, 'unassigned')
  END AS bucket,
  ACCOUNT_TYPE,
  CAME_FROM,
  COUNT(DISTINCT USER_ID) AS distinct_users
FROM RAW.RUDDER_EVENTS.ACCOUNT_CREATED
WHERE TIMESTAMP >= '2026-04-23'  -- 7 days pre-deploy + post
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
