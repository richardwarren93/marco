-- ============================================================================
-- Denormalize member identity onto crew_members so the "your table" seats
-- visual can show names/avatars without cross-reading everyone's profile
-- (same pattern as cooks.author_name). Additive + safe to re-run.
-- The app already writes these best-effort; it works without the migration
-- (seats show "friend"), and lights up with real names once this runs.
-- ============================================================================

alter table public.crew_members add column if not exists display_name text;
alter table public.crew_members add column if not exists avatar text;
