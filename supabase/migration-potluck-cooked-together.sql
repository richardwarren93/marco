-- ── Potluck: cooked together ────────────────────────────────────────────────
--
-- `unique (potluck_id, user_id)` means one dish per person, which is right for
-- friends cooking separately and wrong for two people who cooked ONE dish in
-- one kitchen. Without this they either post the same plate twice — so the
-- spread lies about how many dishes are on the table — or one of them sits the
-- week out.
--
-- A dish can now carry a second name. The submitter still owns the row (the
-- existing ps_insert policy, auth.uid() = user_id, is unchanged), so the
-- co-cook is credit, not authorship.
--
-- Safe to run more than once.

alter table public.potluck_submissions
  add column if not exists co_user_id uuid references auth.users(id) on delete set null;

-- A person appears in a potluck once, whichever side of the dish they are on.
-- `unique (potluck_id, user_id)` already covers the cook; this covers the
-- co-cook.
--
-- What SQL alone cannot express here is the CROSS case: A bringing a dish and
-- naming B, while B also brings one of their own. Those are two different
-- columns on two different rows, so neither unique index sees it. The API
-- checks it on submit (see app/api/potlucks/route.ts) — if that ever needs to
-- be airtight, it wants a trigger or an exclusion constraint over both columns.
create unique index if not exists potluck_submissions_co_user_uniq
  on public.potluck_submissions (potluck_id, co_user_id)
  where co_user_id is not null;

-- Nobody is their own co-cook.
alter table public.potluck_submissions
  drop constraint if exists potluck_submissions_co_user_not_self;
alter table public.potluck_submissions
  add constraint potluck_submissions_co_user_not_self
  check (co_user_id is null or co_user_id <> user_id);
