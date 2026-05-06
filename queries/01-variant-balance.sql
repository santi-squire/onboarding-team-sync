-- ===========================================================
-- Query 1: Variant Balance
-- Purpose: cross-check LaunchDarkly's split (~426/276) against
-- RudderStack/Snowflake as the source of truth.
-- Output: 2 rows (flowA, flowB) with distinct user counts
--         and percentage of total.
-- ===========================================================

WITH assigned AS (
  SELECT
    VARIANT,
    USER_ID,
    TIMESTAMP
  FROM RAW.RUDDER_EVENTS.LOGIN_EXPERIMENT_ASSIGNED
  WHERE TIMESTAMP >= '2026-04-30'  -- post-deploy
    AND VARIANT IN ('flowA', 'flowB')
)
SELECT
  VARIANT,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_assignments,
  ROUND(
    100.0 * COUNT(DISTINCT USER_ID)
    / SUM(COUNT(DISTINCT USER_ID)) OVER (),
    2
  ) AS pct_of_total
FROM assigned
GROUP BY VARIANT
ORDER BY VARIANT;

-- Expected: ~50/50 split.
-- LaunchDarkly currently shows ~61/39. If Snowflake confirms
-- the imbalance, we have a real SRM. If Snowflake shows ~50/50,
-- LD is reporting on a different population (likely cached
-- pre-experiment exposures).
