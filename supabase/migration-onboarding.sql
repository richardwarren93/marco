-- Add onboarding tracking columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cooking_goals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diet_preference text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS referral_source text;
