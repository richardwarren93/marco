-- Add servings to meal_plans so we can track portions at scheduling time
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS servings INTEGER;
