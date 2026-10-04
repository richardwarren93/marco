-- ============================================================================
-- iMessage codeless identity (Option A) + group-id capture.
-- Additive. Apply after migration-imessage.sql.
--
-- First contact creates a lightweight "placeholder" account (a Supabase user
-- with a non-routable synthetic email), so texting works with no signup. The
-- person can later CLAIM it by linking a real account, which MERGES their saved
-- recipes in. Every handled message also records a hashed group id for optional
-- future use. Only the service role touches these.
-- ============================================================================

-- Capture the (hashed) group chat each interaction came from. Nullable = a DM.
-- Append-only breadcrumb; no group semantics are built on it yet.
alter table public.imessage_receipts add column if not exists group_hash text;

-- Has this handle been linked to a real (claimed) account, or is it still a
-- placeholder? Existing rows predate Option A and are all real, so default true;
-- the first-contact path inserts placeholders with claimed = false explicitly.
alter table public.imessage_links add column if not exists claimed boolean not null default true;

-- Claim + merge: bind a texting handle to a real account and fold any recipes
-- the placeholder saved into that account. Atomic, service-role only.
create or replace function public.claim_and_merge_imessage_code(p_hash text, p_sender text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  current_user_id uuid;
begin
  delete from imessage_codes where code_hash = p_hash and expires_at > now() returning user_id into target;
  if target is null then return false; end if;

  select user_id into current_user_id from imessage_links where sender_hash = p_sender;

  -- App-first: this handle has never texted, so no placeholder to merge. Attach
  -- the handle to the account (one handle per account — drop any prior handle).
  if current_user_id is null then
    delete from imessage_links where user_id = target;
    insert into imessage_links(sender_hash, user_id, claimed) values (p_sender, target, true);
    return true;
  end if;

  -- Already this account — just mark it claimed.
  if current_user_id = target then
    update imessage_links set claimed = true where sender_hash = p_sender;
    return true;
  end if;

  -- Merge the placeholder (current_user_id) into the real account (target):
  -- move recipes that don't already exist there (by source_url), drop the rest,
  -- then repoint the handle. The placeholder auth user is left orphaned (owns
  -- nothing) — deleting it would cascade-delete the recipes we just moved.
  update recipes set user_id = target
    where user_id = current_user_id
      and (source_url is null
           or source_url not in (select source_url from recipes where user_id = target and source_url is not null));
  delete from recipes where user_id = current_user_id;

  delete from imessage_links where user_id = target and sender_hash <> p_sender;
  update imessage_links set user_id = target, claimed = true where sender_hash = p_sender;
  return true;
exception when unique_violation then return false;
end $$;

revoke all on function public.claim_and_merge_imessage_code(text,text) from public, anon, authenticated;
grant execute on function public.claim_and_merge_imessage_code(text,text) to service_role;
