-- Historical comparison queries — for the "Historical baseline" section of the tracker
-- Run with: snow sql -f docs/HISTORICAL_QUERIES.sql --connection default --format json
-- Or paste each block individually into Snowsight

-- =====================================================
-- Q1 · Duplicate barber accounts per email · weekly
-- =====================================================
-- Shows, per week: how many new barber USER_IDs were created, and how many of those
-- have an email that ALREADY belonged to another USER_ID (= accidental duplicates).
-- If Flow B is preventing these, the duplicate_pct should drop after Apr 30.

WITH barber_first_seen AS (
  SELECT
    USER_ID,
    CONTEXT_TRAITS_EMAIL AS email,
    MIN(TIMESTAMP) AS first_seen
  FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
    AND CONTEXT_TRAITS_ROLE = 'barber'
    AND CONTEXT_TRAITS_EMAIL IS NOT NULL
  GROUP BY USER_ID, CONTEXT_TRAITS_EMAIL
),
enriched AS (
  SELECT
    USER_ID,
    email,
    first_seen,
    COUNT(*) OVER (PARTITION BY email ORDER BY first_seen
                   ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prior_user_ids
  FROM barber_first_seen
)
SELECT
  DATE_TRUNC('week', first_seen)::DATE AS week_start,
  COUNT(*) AS new_barber_user_ids,
  SUM(CASE WHEN prior_user_ids > 0 THEN 1 ELSE 0 END) AS duplicates,
  ROUND(100.0 * SUM(CASE WHEN prior_user_ids > 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS duplicate_pct
FROM enriched
GROUP BY week_start
ORDER BY week_start;


-- =====================================================
-- Q2 · Indie account first-seen · weekly
-- =====================================================
-- Shows new indies (role='barber' AND user_type IS NULL) per week.
-- Pre-experiment baseline: weeks before 2026-04-30.
-- Experiment window: weeks 2026-04-30+.
-- Eric wanted to see whether indie signups dropped post-launch.

SELECT
  DATE_TRUNC('week', first_seen)::DATE AS week_start,
  COUNT(*) AS new_indies
FROM (
  SELECT USER_ID, MIN(TIMESTAMP) AS first_seen
  FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
    AND CONTEXT_TRAITS_ROLE = 'barber'
    AND CONTEXT_TRAITS_USER_TYPE IS NULL
  GROUP BY USER_ID
)
GROUP BY week_start
ORDER BY week_start;


-- =====================================================
-- Q3 · New barber accounts (any user_type) · weekly
-- =====================================================
-- Counts net-new barbers per week for context (denominator for indie share).

SELECT
  DATE_TRUNC('week', first_seen)::DATE AS week_start,
  COUNT(*) AS new_barbers,
  SUM(CASE WHEN final_user_type = 'Rental' THEN 1 ELSE 0 END) AS rental,
  SUM(CASE WHEN final_user_type = 'Commission' THEN 1 ELSE 0 END) AS commission,
  SUM(CASE WHEN final_user_type IS NULL THEN 1 ELSE 0 END) AS indies
FROM (
  SELECT
    USER_ID,
    MIN(TIMESTAMP) AS first_seen,
    MAX_BY(CONTEXT_TRAITS_USER_TYPE, TIMESTAMP) AS final_user_type
  FROM RAW.RUDDER_EVENTS.IDENTIFIES
  WHERE TIMESTAMP >= DATEADD(day, -90, CURRENT_DATE())
    AND CONTEXT_TRAITS_ROLE = 'barber'
  GROUP BY USER_ID
)
GROUP BY week_start
ORDER BY week_start;


-- =====================================================
-- TODO · Support ticket data
-- =====================================================
-- Tristan is connecting with CS team next week to pull:
--  - Volume of "delete my accidental indie signup" tickets pre vs post Apr 30
--  - Rate per active user / per week
-- Once available, add a row here or query the equivalent if the data lives in Snowflake.
