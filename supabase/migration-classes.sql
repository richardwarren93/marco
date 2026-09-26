-- ============================================================================
-- Marco — live cooking classes (Explore's "cook with a pro" layer).
-- ADDITIVE. A class = a host + a dish + a time + a video room. Free for now
-- (price_cents = 0). room_url is pasted for launch; auto-created via Daily later.
-- ============================================================================

create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references auth.users(id) on delete cascade,
  host_name   text,
  host_avatar text,
  title       text not null,
  dish        text,
  description text,
  cover_url   text,
  starts_at   timestamptz,
  capacity    int default 12,
  price_cents int default 0,          -- 0 = free
  room_url    text,                    -- video room (Daily / Zoom / Whereby)
  status      text default 'upcoming', -- upcoming | live | ended
  created_at  timestamptz not null default now()
);
create index if not exists classes_starts_idx on public.classes(starts_at);

create table if not exists public.class_registrations (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, user_id)
);
create index if not exists class_reg_user_idx on public.class_registrations(user_id);

alter table public.classes             enable row level security;
alter table public.class_registrations enable row level security;

-- Classes are publicly discoverable (Explore); host writes/updates their own.
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select using (true);
drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes for insert with check (auth.uid() = host_id);
drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes for update using (auth.uid() = host_id);

-- Registrations: you see/manage your own; the host can see who registered.
drop policy if exists reg_select on public.class_registrations;
create policy reg_select on public.class_registrations for select
  using (user_id = auth.uid() or exists (select 1 from public.classes c where c.id = class_id and c.host_id = auth.uid()));
drop policy if exists reg_insert on public.class_registrations;
create policy reg_insert on public.class_registrations for insert with check (auth.uid() = user_id);
drop policy if exists reg_delete on public.class_registrations;
create policy reg_delete on public.class_registrations for delete using (auth.uid() = user_id);
