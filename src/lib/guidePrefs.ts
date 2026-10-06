import type { SupabaseClient } from "@supabase/supabase-js";

// The guide's per-user state lives in user_preferences.taste_profile.guide — a
// small JSON bag of flags (people_household: true, …) and ids
// (table_family: <crew id>, …). Server-only (pass the admin client).

export type GuideBag = Record<string, unknown>;

export async function getGuidePrefs(admin: SupabaseClient, userId: string): Promise<GuideBag> {
  const { data } = await admin.from("user_preferences").select("taste_profile").eq("user_id", userId).maybeSingle();
  const tp = (data?.taste_profile as Record<string, unknown> | null) ?? {};
  return { ...((tp.guide as GuideBag | undefined) ?? {}) };
}

// Merge `patch` into the guide bag, keeping every other taste_profile key.
export async function setGuidePrefs(admin: SupabaseClient, userId: string, patch: GuideBag): Promise<boolean> {
  const { data, error: readError } = await admin.from("user_preferences").select("taste_profile").eq("user_id", userId).maybeSingle();
  // A failed read must never become "empty" — the upsert would wipe the profile.
  if (readError) return false;
  const tp = { ...((data?.taste_profile as Record<string, unknown> | null) ?? {}) };
  tp.guide = { ...((tp.guide as GuideBag | undefined) ?? {}), ...patch };
  const { error } = await admin.from("user_preferences").upsert({ user_id: userId, taste_profile: tp, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return !error;
}
