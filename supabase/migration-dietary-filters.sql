-- Cook with Marco — Phase 2 dietary filters.
--
-- Profile-level toggles like "vegetarian" or "dairy-free" that flag
-- conflicting ingredients on recipes (after standing subs are applied).
-- Stored as a string array on user_profiles so we can grow the set of
-- supported filters without further migrations. Empty array means "no
-- filters" — the default.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS dietary_filters TEXT[] NOT NULL DEFAULT '{}'::TEXT[];
