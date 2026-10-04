import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Option A — a texter gets an identity with no signup. The first time a handle
// saves something, we mint a lightweight "placeholder" Supabase user and link
// the handle to it, so saving/retrieving works immediately. Later they CLAIM it
// (link a real account), which merges these recipes in. The synthetic email is
// random and non-routable (.invalid) — never used to sign in, never collides.
export async function ensureParticipant(admin: SupabaseClient, senderHash: string): Promise<string | null> {
  const existing = await admin.from("imessage_links").select("user_id").eq("sender_hash", senderHash).maybeSingle();
  if (existing.error) return null;
  if (existing.data) return existing.data.user_id as string;

  const created = await admin.auth.admin.createUser({
    email: `imsg-${randomBytes(16).toString("hex")}@imsg.marco.invalid`,
    email_confirm: true,
    password: randomBytes(24).toString("hex"),
    user_metadata: { imessage_placeholder: true },
  });
  if (created.error || !created.data.user) {
    const retry = await admin.from("imessage_links").select("user_id").eq("sender_hash", senderHash).maybeSingle();
    return (retry.data?.user_id as string) ?? null;
  }

  const userId = created.data.user.id;
  const linked = await admin.from("imessage_links").insert({ sender_hash: senderHash, user_id: userId, claimed: false });
  if (linked.error) {
    // A concurrent first-contact won the race, or the insert failed — don't
    // leave an orphan auth user behind.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    const retry = await admin.from("imessage_links").select("user_id").eq("sender_hash", senderHash).maybeSingle();
    return (retry.data?.user_id as string) ?? null;
  }
  return userId;
}
