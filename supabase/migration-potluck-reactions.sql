-- ── Potluck: hearts, notes and nudges ───────────────────────────────────────
--
-- The three social moves the spec asks for, in one table, because they differ
-- only in what they point at and whether they carry words:
--
--   heart  → a dish.    One per person per dish, and it can be taken back.
--   note   → a dish.    Several allowed; a note is a thing you said.
--   nudge  → a person.  "How's that pudding coming along?" One per potluck,
--                       per sender, per recipient — a reminder that can be
--                       sent twice is a nag.
--
-- Safe to run more than once.

create table if not exists public.potluck_reactions (
  id             uuid primary key default gen_random_uuid(),
  potluck_id     uuid not null references public.potlucks(id) on delete cascade,
  from_user_id   uuid not null references auth.users(id) on delete cascade,
  kind           text not null check (kind in ('heart', 'note', 'nudge')),
  -- A heart and a note land on a dish; a nudge lands on a person. Exactly one
  -- of these is set, which the check below enforces rather than trusting.
  submission_id  uuid references public.potluck_submissions(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  body           text,
  created_at     timestamptz not null default now(),

  constraint potluck_reactions_target check (
    (kind in ('heart', 'note') and submission_id is not null and target_user_id is null)
    or (kind = 'nudge' and target_user_id is not null and submission_id is null)
  ),
  -- A note with nothing written in it is not a note.
  constraint potluck_reactions_body check (kind <> 'note' or (body is not null and length(btrim(body)) > 0))
);

create index if not exists potluck_reactions_potluck_idx on public.potluck_reactions(potluck_id, created_at desc);
create index if not exists potluck_reactions_submission_idx on public.potluck_reactions(submission_id);

-- One heart per person per dish — the button is a toggle, not a counter you
-- can run up.
create unique index if not exists potluck_reactions_one_heart
  on public.potluck_reactions (submission_id, from_user_id)
  where kind = 'heart';

-- One nudge per sender per recipient per potluck.
create unique index if not exists potluck_reactions_one_nudge
  on public.potluck_reactions (potluck_id, target_user_id, from_user_id)
  where kind = 'nudge';

alter table public.potluck_reactions enable row level security;

-- Visible to the table it happened at. `is_crew_member` is the helper the rest
-- of the social schema already uses, and it is SECURITY DEFINER so this does
-- not recurse through crew_members' own policies.
drop policy if exists pr_select on public.potluck_reactions;
create policy pr_select on public.potluck_reactions for select
  using (exists (select 1 from public.potlucks p where p.id = potluck_id and public.is_crew_member(p.crew_id)));

-- You may only send as yourself, and only at a table you are at.
drop policy if exists pr_insert on public.potluck_reactions;
create policy pr_insert on public.potluck_reactions for insert
  with check (
    auth.uid() = from_user_id
    and exists (select 1 from public.potlucks p where p.id = potluck_id and public.is_crew_member(p.crew_id))
  );

-- Taking back your own heart. Notes and nudges are things you said; they stay.
drop policy if exists pr_delete on public.potluck_reactions;
create policy pr_delete on public.potluck_reactions for delete
  using (auth.uid() = from_user_id and kind = 'heart');
