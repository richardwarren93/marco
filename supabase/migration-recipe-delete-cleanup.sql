-- ── Deleting a recipe should take its loose ends with it ────────────────────
--
-- Two columns point at a recipe and neither has ever been a foreign key:
--
--   saves.recipe_id        — a recipe you saved to your kitchen
--   cooks.source_recipe_id — the recipe a post was made from
--
-- So deleting a recipe left both dangling. The save stayed in your kitchen
-- forever, and the cook kept offering "open the recipe" on a link that leads
-- to "Recipe not found". Reported from the live app: delete a recipe and it
-- does not go away everywhere it was.
--
-- The two want DIFFERENT behaviour, which is probably why neither got one.
--
--   A save IS the recipe. With the recipe gone there is nothing to save, so
--   it cascades.
--
--   A cook is a record of something you actually made. It should outlive the
--   recipe — you still cooked it — so only the LINK goes, not the post.
--
-- Existing rows are cleaned first, because a foreign key cannot be added to a
-- column that already contains values pointing nowhere.
--
-- Safe to run more than once.

delete from public.saves s
where s.recipe_id is not null
  and not exists (select 1 from public.recipes r where r.id = s.recipe_id);

update public.cooks c
set source_recipe_id = null
where c.source_recipe_id is not null
  and not exists (select 1 from public.recipes r where r.id = c.source_recipe_id);

alter table public.saves drop constraint if exists saves_recipe_id_fkey;
alter table public.saves
  add constraint saves_recipe_id_fkey
  foreign key (recipe_id) references public.recipes(id) on delete cascade;

alter table public.cooks drop constraint if exists cooks_source_recipe_id_fkey;
alter table public.cooks
  add constraint cooks_source_recipe_id_fkey
  foreign key (source_recipe_id) references public.recipes(id) on delete set null;

-- `cooks` has select, insert and delete policies and no UPDATE policy, so
-- nothing in the app can null that column itself — this constraint is the only
-- thing that can do it.
