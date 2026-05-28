-- Allow 'youtube' as a recipe source_platform.
-- The original CHECK constraint only allowed instagram/tiktok/other, so
-- saving a recipe extracted from a YouTube watch/Shorts URL failed with
-- "violates check constraint recipes_source_platform_check" — surfaced
-- to the user as "Failed to save recipe."

ALTER TABLE recipes
  DROP CONSTRAINT IF EXISTS recipes_source_platform_check;

ALTER TABLE recipes
  ADD CONSTRAINT recipes_source_platform_check
  CHECK (source_platform IN ('instagram', 'tiktok', 'youtube', 'other'));
