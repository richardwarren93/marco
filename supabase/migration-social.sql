-- ============================================================================
-- Marco social pivot — the "crews + cooks + potlucks" spine.
--
-- ADDITIVE ONLY: creates new tables; touches nothing existing. Safe to run on
-- the existing project. Idempotent — safe to re-run. To undo: drop these tables.
--
-- Model: you're in small closed CREWS (your table). Your feed = your crews'
-- COOKS. POTLUCKS are themed prompts inside a crew. SAVES = Add to My Kitchen.
-- Cold-start is solved by construction: you join into a populated crew.
-- ============================================================================

-- ── Crews ────────────────────────────────────────────────────────────────────
create table if not exists public.crews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emoji       text,
  created_by  uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default lower(substr(md5(random()::text), 1, 8)),
  created_at  timestamptz not null default now()
);

create table if not exists public.crew_members (
  id        uuid primary key default gen_random_uuid(),
  crew_id   uuid not null references public.crews(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member',        -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  unique (crew_id, user_id)
);
create index if not exists crew_members_user_idx on public.crew_members(user_id);
create index if not exists crew_members_crew_idx on public.crew_members(crew_id);

-- ── Cooks (a post: what you made) ────────────────────────────────────────────
create table if not exists public.cooks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  crew_id          uuid references public.crews(id) on delete set null,   -- null = self/kitchen only
  title            text,
  note             text,
  photo_url        text,
  card_treatment   text default 'polaroid',        -- polaroid | receipt | poster
  author_name      text,                            -- denormalized for the feed
  author_avatar    text,                            -- initial/emoji for the feed
  source_recipe_id uuid,                            -- provenance: recipe cooked (optional)
  from_user        uuid references auth.users(id),  -- provenance: whose recipe (lineage)
  created_at       timestamptz not null default now()
);
create index if not exists cooks_crew_idx on public.cooks(crew_id, created_at desc);
create index if not exists cooks_user_idx on public.cooks(user_id, created_at desc);

-- ── Potlucks (themed prompt + deadline in a crew) ───────────────────────────
create table if not exists public.potlucks (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.crews(id) on delete cascade,
  theme      text not null,
  emoji      text,
  prompt     text,
  deadline   date,
  created_by uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'active',       -- active | served
  created_at timestamptz not null default now()
);
create index if not exists potlucks_crew_idx on public.potlucks(crew_id, created_at desc);

create table if not exists public.potluck_submissions (
  id          uuid primary key default gen_random_uuid(),
  potluck_id  uuid not null references public.potlucks(id) on delete cascade,
  cook_id     uuid not null references public.cooks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (potluck_id, user_id)
);

-- ── Saves (Add to My Kitchen — "want to cook", with provenance) ─────────────
create table if not exists public.saves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  cook_id    uuid references public.cooks(id) on delete cascade,
  recipe_id  uuid,
  from_user  uuid references auth.users(id),       -- who you saved it from
  created_at timestamptz not null default now()
);
create index if not exists saves_user_idx on public.saves(user_id, created_at desc);

-- ── Helper: membership check (defined AFTER crew_members exists) ─────────────
-- SECURITY DEFINER so it bypasses RLS (no recursion when used in policies).
create or replace function public.is_crew_member(p_crew_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.crew_members m
    where m.crew_id = p_crew_id and m.user_id = auth.uid()
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.crews               enable row level security;
alter table public.crew_members        enable row level security;
alter table public.cooks               enable row level security;
alter table public.potlucks            enable row level security;
alter table public.potluck_submissions enable row level security;
alter table public.saves               enable row level security;

drop policy if exists crews_select on public.crews;
create policy crews_select on public.crews for select using (true);
drop policy if exists crews_insert on public.crews;
create policy crews_insert on public.crews for insert with check (auth.uid() = created_by);
drop policy if exists crews_update on public.crews;
create policy crews_update on public.crews for update using (auth.uid() = created_by);

drop policy if exists cm_select on public.crew_members;
create policy cm_select on public.crew_members for select using (public.is_crew_member(crew_id));
drop policy if exists cm_insert on public.crew_members;
create policy cm_insert on public.crew_members for insert with check (auth.uid() = user_id);
drop policy if exists cm_delete on public.crew_members;
create policy cm_delete on public.crew_members for delete using (auth.uid() = user_id);

drop policy if exists cooks_select on public.cooks;
create policy cooks_select on public.cooks for select
  using (user_id = auth.uid() or (crew_id is not null and public.is_crew_member(crew_id)));
drop policy if exists cooks_insert on public.cooks;
create policy cooks_insert on public.cooks for insert with check (auth.uid() = user_id);
drop policy if exists cooks_delete on public.cooks;
create policy cooks_delete on public.cooks for delete using (auth.uid() = user_id);

drop policy if exists pot_select on public.potlucks;
create policy pot_select on public.potlucks for select using (public.is_crew_member(crew_id));
drop policy if exists pot_insert on public.potlucks;
create policy pot_insert on public.potlucks for insert with check (public.is_crew_member(crew_id) and auth.uid() = created_by);
drop policy if exists pot_update on public.potlucks;
create policy pot_update on public.potlucks for update using (public.is_crew_member(crew_id));

drop policy if exists ps_select on public.potluck_submissions;
create policy ps_select on public.potluck_submissions for select
  using (exists (select 1 from public.potlucks p where p.id = potluck_id and public.is_crew_member(p.crew_id)));
drop policy if exists ps_insert on public.potluck_submissions;
create policy ps_insert on public.potluck_submissions for insert with check (auth.uid() = user_id);

drop policy if exists saves_all on public.saves;
create policy saves_all on public.saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage: a public bucket for cook photos ────────────────────────────────
insert into storage.buckets (id, name, public)
values ('cooks', 'cooks', true)
on conflict (id) do nothing;

drop policy if exists cooks_upload on storage.objects;
create policy cooks_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'cooks' and owner = auth.uid());
drop policy if exists cooks_read on storage.objects;
create policy cooks_read on storage.objects for select using (bucket_id = 'cooks');
