-- Migration: Private recipe notes and personal ratings
-- Each user can have their own private note + rating per recipe

CREATE TABLE recipe_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  private_note text DEFAULT '',
  personal_rating smallint CHECK (personal_rating >= 1 AND personal_rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE recipe_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recipe notes"
  ON recipe_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_recipe_notes_user_recipe ON recipe_notes(user_id, recipe_id);
