-- Group chats as Tables.
--
-- Marco can sit in three kinds of iMessage group chat:
--   household        → ONE shared kitchen (household_groups). Recipe links
--                      dropped there land in everyone's kitchen.
--   family / friends → a TABLE: a crew where people share what they COOKED
--                      ("I made lasagna" → a cook on that crew). Recipe links
--                      there are never saved for everyone; a ❤️ on one saves it
--                      to the reactor's own kitchen.
--
-- crew_groups ties a group chat (its hashed id, group_hash) to a crew, which
-- makes that chat a Table. Binding happens ONLY from a signed, expiring token
-- inside the seed message the app writes when someone starts the chat — never
-- inferred from who happens to be in the thread. One crew per group; binding
-- a group to a crew clears any household binding for it, and vice versa.
--
-- Additive + idempotent. Safe to run before or after the code deploy: the
-- iMessage route treats a missing crew_groups as "no tables yet". Writes happen
-- via the service role only (RLS bypassed); the SELECT policy lets crew
-- members read which groups their table is linked to.

CREATE TABLE IF NOT EXISTS crew_groups (
  group_hash text PRIMARY KEY,
  crew_id uuid REFERENCES crews(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crew_groups_crew_idx ON crew_groups(crew_id);

ALTER TABLE crew_groups ENABLE ROW LEVEL SECURITY;

-- No INSERT / UPDATE / DELETE policies: only the service role writes here.
REVOKE INSERT, UPDATE, DELETE ON crew_groups FROM anon, authenticated;

DO $$ BEGIN
  CREATE POLICY "Members can view crew groups" ON crew_groups FOR SELECT
    USING (public.is_crew_member(crew_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Household chats become explicit too. The old code tied ANY group to a
-- household the moment a household member posted a link in it — which turned
-- family and friends chats into household kitchens. From now on a household
-- binding counts only if an invite set bound_by; legacy rows (bound_by NULL)
-- are ignored by the route (kept, not deleted, so nothing is lost). To make an
-- old household chat a shared kitchen again, start it from the app.
ALTER TABLE household_groups ADD COLUMN IF NOT EXISTS bound_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
