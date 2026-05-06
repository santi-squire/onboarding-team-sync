-- ===========================================================
-- Query 4: Email Check Result Distribution (Flow B exclusive)
-- Purpose: tells us who is actually entering through Flow B —
--   returning users, invited barbers (temp_password), or new users.
-- Output: result counts + percentage breakdown.
-- ===========================================================

SELECT
  RESULT,
  INPUT_TYPE,
  COUNT(DISTINCT USER_ID) AS distinct_users,
  COUNT(*) AS total_events,
  ROUND(
    100.0 * COUNT(*)
    / SUM(COUNT(*)) OVER (),
    2
  ) AS pct_of_total
FROM RAW.RUDDER_EVENTS.EMAIL_CHECK_RESULT
WHERE TIMESTAMP >= '2026-04-30'
  AND VARIANT = 'flowB'  -- Flow B only
GROUP BY RESULT, INPUT_TYPE
ORDER BY total_events DESC;

-- Watch for:
-- - Healthy temp_password share = experiment is catching
--   real invited barbers (the target population).
-- - High new_user share = accidental signups still leaking
--   through despite Flow B's email check.
-- - input_type = 'username' suggests legacy barbers with
--   non-email logins; expected to be rare.
