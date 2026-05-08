-- Cook with Marco — Phase 2 standing substitution preferences.
--
-- A small profile-level table of "always swap X for Y" rules that get
-- applied silently when rendering recipe ingredients. Set from the
-- substitution sheet's "Make this a standing preference" action; revert
-- in-place from the recipe detail's ↳ marker.
--
-- Per-user, unique on (user_id, lower(trim(from_name))) so the same
-- ingredient can't accumulate competing rules. Replacing an existing
-- preference is an upsert against that unique key.

CREATE TABLE IF NOT EXISTS user_standing_subs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  to_amount TEXT,
  to_unit TEXT,
  ratio_note TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_standing_subs_unique_user_from
  ON user_standing_subs (user_id, lower(trim(from_name)));

CREATE INDEX IF NOT EXISTS user_standing_subs_user_id
  ON user_standing_subs (user_id);

ALTER TABLE user_standing_subs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own standing subs"
  ON user_standing_subs FOR ALL USING (auth.uid() = user_id);
