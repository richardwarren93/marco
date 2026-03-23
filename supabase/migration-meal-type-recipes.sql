-- Add meal_type to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) DEFAULT 'dinner';

-- Backfill existing recipes with 'dinner'
UPDATE recipes SET meal_type = 'dinner' WHERE meal_type IS NULL;

-- Make it NOT NULL
ALTER TABLE recipes ALTER COLUMN meal_type SET NOT NULL;

-- Create recipe-images storage bucket (for cookbook photo uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT DO NOTHING;

-- Storage policies for recipe-images
CREATE POLICY "Users can upload recipe images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view recipe images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

CREATE POLICY "Users can delete own recipe images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
