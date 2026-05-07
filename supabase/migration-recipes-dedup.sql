-- Prevent duplicate recipes per user.
--
-- Three partial unique indexes mirror the app-level fingerprint in
-- src/lib/recipes/dedup.ts:
--   1. (user_id, source_url)                      when source_url is set
--   2. (user_id, lower(trim(title)), image_url)   when source_url is null but image_url is set
--   3. (user_id, lower(trim(title)))              when both are null
--
-- IMPORTANT: CREATE UNIQUE INDEX will FAIL if existing rows already violate
-- the constraint. Preview duplicates with the SELECT below and clean up
-- before running the index DDL.
--
-- ── Step 1: preview duplicates (read-only) ─────────────────────────────────
--
-- SELECT
--   user_id,
--   COALESCE(
--     'url:' || source_url,
--     CASE WHEN image_url IS NOT NULL
--          THEN 'img:' || lower(trim(title)) || '|' || image_url END,
--     'title:' || lower(trim(title))
--   ) AS dedup_key,
--   array_agg(id ORDER BY created_at) AS row_ids,
--   array_agg(title ORDER BY created_at) AS titles,
--   COUNT(*) AS n
-- FROM recipes
-- GROUP BY user_id, dedup_key
-- HAVING COUNT(*) > 1
-- ORDER BY n DESC;
--
-- ── Step 2: optional auto-cleanup — keep oldest, delete rest ───────────────
-- Review the preview above first. This DELETE is destructive; it permanently
-- removes the newer copies. Run inside a transaction so you can ROLLBACK if
-- the result looks wrong.
--
-- BEGIN;
-- DELETE FROM recipes r USING (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (
--       PARTITION BY user_id, COALESCE(
--         'url:' || source_url,
--         CASE WHEN image_url IS NOT NULL
--              THEN 'img:' || lower(trim(title)) || '|' || image_url END,
--         'title:' || lower(trim(title))
--       )
--       ORDER BY created_at ASC
--     ) AS rn
--     FROM recipes
--   ) t WHERE rn > 1
-- ) d WHERE r.id = d.id;
-- -- Verify the deleted count looks right, then:
-- COMMIT;  -- or ROLLBACK;
--
-- ── Step 3: create the unique indexes ──────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS recipes_unique_user_url
  ON recipes (user_id, source_url)
  WHERE source_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recipes_unique_user_title_image
  ON recipes (user_id, lower(trim(title)), image_url)
  WHERE source_url IS NULL AND image_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recipes_unique_user_title
  ON recipes (user_id, lower(trim(title)))
  WHERE source_url IS NULL AND image_url IS NULL;
