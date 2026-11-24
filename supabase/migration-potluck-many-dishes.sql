-- ── Potluck: bring more than one thing ──────────────────────────────────────
--
-- `unique (potluck_id, user_id)` has shaped every decision on this feature so
-- far — it is why a claim and a cooked dish had to be the same row, and why
-- being named on someone else's dish had to count as having brought one. But
-- people bring two things to a potluck. A main and a pudding, bread and a dip.
--
-- Dropping it is the whole change. One row is one dish; a person may have
-- several.
--
-- Safe to run more than once.

-- Dropped by SHAPE, not by name. The constraint was declared inline in
-- migration-social.sql, so its name is whatever Postgres generated — almost
-- certainly potluck_submissions_potluck_id_user_id_key, but `drop constraint
-- if exists <wrong name>` succeeds silently and would leave the constraint in
-- place. The feature would then look fine until the second dish, and fail as a
-- 23505 nobody was expecting. So: find any unique constraint over exactly
-- (potluck_id, user_id) and drop it, whatever it is called.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'potluck_submissions'
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by att.attname)
        from unnest(con.conkey) k
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k
      ) = array['potluck_id', 'user_id']
  loop
    execute format('alter table public.potluck_submissions drop constraint %I', c.conname);
  end loop;
end $$;

-- The co-cook index goes with it, and for the same reason: if you can bring
-- three dishes, the person who helped with two of them is named on two of
-- them. "A person appears in a potluck once" is simply no longer true, so the
-- API's cross-check for it goes too (see app/api/potlucks/route.ts).
--
-- What survives is per-dish and still right: nobody is their own co-cook,
-- which is the CHECK added by migration-potluck-cooked-together.sql.
drop index if exists public.potluck_submissions_co_user_uniq;

-- Several dishes means being able to take one back. Until now a submission
-- could not be removed at all — there was one per person, and deleting it
-- would have meant leaving the potluck. A fourth dish added by mistake is a
-- different thing, so there is now a delete policy for your own rows.
drop policy if exists ps_delete on public.potluck_submissions;
create policy ps_delete on public.potluck_submissions for delete
  using (auth.uid() = user_id);

-- Reading a person's dishes in a potluck is now a list, not a lookup.
create index if not exists potluck_submissions_potluck_user_idx
  on public.potluck_submissions (potluck_id, user_id);
