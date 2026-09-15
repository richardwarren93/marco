-- Marco "Kitchen is Home" pivot — per-user evolving-kitchen state + skills.
-- Kept as JSONB columns on existing rows (user_profiles, cook_profiles) to avoid
-- extra joins; both tables already have own-row RLS.

-- Per-user kitchen: which kitchen is active + the progression level of each zone.
-- zones.herb 0..3 (sprout → healthy → trio → window garden) is the first
-- consistency-driven transformation; other zones reserved for later phases.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS kitchen_state JSONB NOT NULL DEFAULT
    '{"active_kitchen":"starter","zones":{"herb":0,"stove":0,"bookshelf":0,"wall":0,"counter":0}}'::jsonb;

-- Per-user learned skills (technique mastery). Shape: { "<skill>": { "experiences": <int>, "level": "<label>" } }
-- e.g. { "saute": { "experiences": 8, "level": "comfortable" } }.
ALTER TABLE cook_profiles
  ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '{}'::jsonb;
