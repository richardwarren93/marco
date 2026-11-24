-- ── Potluck: say what you're bringing ───────────────────────────────────────
--
-- A submission could only ever be a dish you had ALREADY cooked and posted to
-- the table. That is backwards for something weekly: the potluck is supposed
-- to be what prompts the cooking, and instead you could not join one until you
-- had cooked something anyway.
--
-- A submission now starts as a claim — "I'm bringing this" — picked from your
-- saved recipes, and gains a cook (and its photo) when you make it. One row
-- the whole way through, because `unique (potluck_id, user_id)` means a claim
-- and a cooked dish from the same person cannot be two rows.
--
-- Safe to run more than once.

alter table public.potluck_submissions
  alter column cook_id drop not null;

alter table public.potluck_submissions
  add column if not exists recipe_id uuid references public.recipes(id) on delete set null;

-- The claim carries its OWN label, rather than reading through to the recipe.
--
-- Two reasons, and the first is not optional: `recipes` is RLS'd to its owner
-- ("Users can CRUD own recipes"), so nobody else at the table could read the
-- title of what you are bringing — the whole point of saying it. Widening that
-- policy would make private recipes crew-readable for the sake of one line of
-- text.
--
-- The second is that a potluck is a record of an event. What you said you were
-- bringing in March should not change because you renamed the recipe in May,
-- or disappear because you deleted it.
alter table public.potluck_submissions
  add column if not exists claimed_title text;
alter table public.potluck_submissions
  add column if not exists claimed_image text;

-- cook_id's foreign key was ON DELETE CASCADE: deleting the cook deleted the
-- submission. That was fine when the cook WAS the submission. Now the row may
-- also be the only record that you said you would bring something, so it has
-- to survive the cook going away.
alter table public.potluck_submissions
  drop constraint if exists potluck_submissions_cook_id_fkey;
alter table public.potluck_submissions
  add constraint potluck_submissions_cook_id_fkey
  foreign key (cook_id) references public.cooks(id) on delete set null;

-- A row is a claim, a cooked dish, or both — never neither.
alter table public.potluck_submissions
  drop constraint if exists potluck_submissions_has_dish;
alter table public.potluck_submissions
  add constraint potluck_submissions_has_dish
  check (cook_id is not null or claimed_title is not null);

-- Until now a submission was only ever inserted, so there was no update policy
-- and RLS refused every update. Filling in what you cooked, and changing your
-- mind about what you are bringing, are both updates to your own row.
drop policy if exists ps_update on public.potluck_submissions;
create policy ps_update on public.potluck_submissions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
