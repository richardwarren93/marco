-- Private integration state. Only the server service role can access it.
create table if not exists public.imessage_links (
 sender_hash text primary key,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.imessage_codes (
 code_hash text primary key,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 expires_at timestamptz not null
);
create table if not exists public.imessage_receipts (
 id text primary key,
 sender_hash text not null,
 reply text,
 created_at timestamptz not null default now()
);
create index if not exists imessage_receipts_sender_time on public.imessage_receipts(sender_hash, created_at);
alter table public.imessage_links enable row level security;
alter table public.imessage_codes enable row level security;
alter table public.imessage_receipts enable row level security;
revoke all on public.imessage_links, public.imessage_codes, public.imessage_receipts from anon, authenticated;
grant all on public.imessage_links, public.imessage_codes, public.imessage_receipts to service_role;

create or replace function public.claim_imessage_code(p_hash text, p_sender text)
returns boolean language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
 delete from imessage_codes where code_hash=p_hash and expires_at>now() returning user_id into target;
 if target is null then return false; end if;
 -- Both sides must disconnect before linking a different account or sender.
 insert into imessage_links(sender_hash,user_id) values(p_sender,target);
 return true;
exception when unique_violation then return false;
end $$;
revoke all on function public.claim_imessage_code(text,text) from public, anon, authenticated;
grant execute on function public.claim_imessage_code(text,text) to service_role;
