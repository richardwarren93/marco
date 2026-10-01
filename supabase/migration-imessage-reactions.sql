-- Only public source URLs are retained, never another user's private recipe data.
create table if not exists public.imessage_shared_recipes (
 message_key text primary key,
 source_url text not null,
 created_at timestamptz not null default now()
);
alter table public.imessage_shared_recipes enable row level security;
revoke all on public.imessage_shared_recipes from anon, authenticated;
grant all on public.imessage_shared_recipes to service_role;
