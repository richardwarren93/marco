-- Legacy ratings: inspect, then (optionally) migrate `recipe_ratings` →
-- `recipe_star_ratings`.
--
-- RUN supabase/migration-recipe-ratings.sql FIRST. Nothing here works until
-- recipe_star_ratings exists.
--
-- NOTHING IN THIS FILE DROPS ANYTHING. Steps 1–2 are read-only. Step 3 only
-- INSERTs, and skips any (user_id, recipe_id) that already has a rating, so
-- it is safe to re-run and never overwrites a newer rating.
--
-- ── Why these rows exist, and why they're probably real ──────────────────
-- The legacy path was NOT dead on arrival (SIMPLIFY.md §Phase 4 says it was;
-- that's true of the final state of the code, not of its history). Git shows
-- `<CommunitySection sourceUrl={recipe.source_url} />` — which renders
-- RatingStars — was actually rendered on the recipe detail page from
-- 050830b (2026-03-15) to eedffd9 (2026-04-05), for every recipe that had a
-- source_url. So users could rate for about three weeks. Expect real rows.
--
-- ── Why "resolve source_url to Discover's representative recipe_id" is the
--    wrong target ────────────────────────────────────────────────────────
-- /api/recipes/discover picks its representative in TypeScript, not SQL, and
-- the pick is neither stable nor global:
--   * it groups by NORMALIZED TITLE (lower/trim/strip punctuation), not by
--     source_url, so the two key spaces don't line up: one URL spans several
--     title groups, one title group spans rows with different or NULL URLs;
--   * it is viewer-dependent — `if (myTitles.has(normalizedTitle)) continue`
--     skips any group the viewer already owns;
--   * it is time-dependent — rows are scanned created_at DESC (limit 2000),
--     so the newest copy carrying an image becomes the representative. Save a
--     new copy of a recipe and the representative FLIPS, and every rating
--     pinned to the old one vanishes from Discover.
-- There is therefore no durable representative recipe_id to migrate onto.
-- See the follow-up note in SIMPLIFY-RATINGS.md — that drift is a live bug
-- for ratings left today, not just for migrated ones.
--
-- What we migrate instead: each legacy rating goes to the rating author's OWN
-- saved copy of that URL. That is literally what they were looking at when
-- they rated (the widget took sourceUrl from the recipe row on screen), so it
-- is a faithful reconstruction, and it is deterministic in SQL. Effect: each
-- user's star reappears on their own recipe's detail page. It will NOT light
-- up Discover averages — see the drift bug above.


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1 — Is there anything to migrate? (read-only)
-- If total_legacy_rows is 0, you're done: delete nothing, migrate nothing.
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM recipe_ratings)                          AS total_legacy_rows,
  (SELECT count(DISTINCT user_id) FROM recipe_ratings)           AS distinct_raters,
  (SELECT count(DISTINCT source_url) FROM recipe_ratings)        AS distinct_urls,
  (SELECT min(created_at) FROM recipe_ratings)                   AS earliest,
  (SELECT max(created_at) FROM recipe_ratings)                   AS latest,
  -- how many resolve to a recipe the SAME user saved from that URL
  (SELECT count(*) FROM recipe_ratings rr
     WHERE EXISTS (SELECT 1 FROM recipes r
                   WHERE r.source_url = rr.source_url AND r.user_id = rr.user_id))
                                                                 AS resolvable_own_copy,
  -- how many would be stranded (rater no longer has a copy of that URL)
  (SELECT count(*) FROM recipe_ratings rr
     WHERE NOT EXISTS (SELECT 1 FROM recipes r
                       WHERE r.source_url = rr.source_url AND r.user_id = rr.user_id))
                                                                 AS stranded;


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2 — Dry run: exactly what STEP 3 would insert. (read-only)
-- Eyeball this before running step 3.
-- ─────────────────────────────────────────────────────────────────────────
WITH resolved AS (
  SELECT DISTINCT ON (rr.user_id, rr.source_url)
    rr.user_id,
    r.id   AS recipe_id,
    r.title,
    rr.source_url,
    rr.rating,
    rr.created_at
  FROM recipe_ratings rr
  JOIN recipes r
    ON r.source_url = rr.source_url
   AND r.user_id    = rr.user_id
  -- if the user saved the same URL more than once, take the copy they most
  -- likely had in front of them: the oldest one created at or before the rating
  ORDER BY rr.user_id, rr.source_url,
           (r.created_at <= rr.created_at) DESC, r.created_at ASC
)
SELECT
  resolved.*,
  EXISTS (
    SELECT 1 FROM recipe_star_ratings s
    WHERE s.user_id = resolved.user_id AND s.recipe_id = resolved.recipe_id
  ) AS already_rated_will_be_skipped
FROM resolved
ORDER BY created_at;


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3 — The migration. Additive only; re-runnable.
-- Uncomment and run once you're happy with step 2.
-- ─────────────────────────────────────────────────────────────────────────
-- INSERT INTO recipe_star_ratings (user_id, recipe_id, rating, created_at, updated_at)
-- SELECT DISTINCT ON (rr.user_id, rr.source_url)
--   rr.user_id,
--   r.id,
--   rr.rating::smallint,
--   rr.created_at,
--   now()
-- FROM recipe_ratings rr
-- JOIN recipes r
--   ON r.source_url = rr.source_url
--  AND r.user_id    = rr.user_id
-- WHERE rr.rating BETWEEN 1 AND 5
-- ORDER BY rr.user_id, rr.source_url,
--          (r.created_at <= rr.created_at) DESC, r.created_at ASC
-- ON CONFLICT (user_id, recipe_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4 — Verify, and how to undo. (read-only)
-- Migrated rows are identifiable: created_at predates the new table, and
-- updated_at is the moment you ran step 3.
-- ─────────────────────────────────────────────────────────────────────────
-- SELECT count(*) AS migrated_in, min(created_at), max(created_at)
-- FROM recipe_star_ratings
-- WHERE created_at < '2026-04-06';
--
-- To undo step 3 (only the rows it added), narrow by the updated_at stamp
-- step 3 wrote, e.g.:
--   DELETE FROM recipe_star_ratings
--   WHERE created_at < '2026-04-06' AND updated_at > '<the timestamp you ran it>';


-- ─────────────────────────────────────────────────────────────────────────
-- DO NOT DROP recipe_ratings YET.
-- Keep it until step 4 looks right and you've lived with the result. It is
-- orphaned in code (no reference anywhere in src/ as of 2026-11-22) so it
-- costs nothing to leave in place, and it is the only copy of the `stranded`
-- rows step 1 counts — the ones whose rater no longer has a copy of the URL.
-- ─────────────────────────────────────────────────────────────────────────
