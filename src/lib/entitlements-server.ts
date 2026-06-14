// Server-side entitlement reads + gate helpers. Routes call getUserTier() to
// learn the caller's tier, then the assert* helpers to enforce a limit. While
// ENFORCE_ENTITLEMENTS is false the assert helpers always allow (Phase 1), so
// wiring them now is safe and becomes live the moment the flag flips.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ENFORCE_ENTITLEMENTS,
  FREE_LIMITS,
  limitsFor,
  plusRequired,
  type GateFeature,
  type Tier,
} from "./entitlements";

interface SubRow {
  subscription_tier: string | null;
  plus_expires_at: string | null;
}

/** A user is 'plus' only if the column says so AND the entitlement hasn't
 *  lapsed. Defaults to 'free' for anything unexpected. */
export function resolveTier(row: SubRow | null | undefined): Tier {
  if (!row || row.subscription_tier !== "plus") return "free";
  if (row.plus_expires_at && new Date(row.plus_expires_at).getTime() < Date.now()) {
    return "free";
  }
  return "plus";
}

export async function getUserTier(supabase: SupabaseClient, userId: string): Promise<Tier> {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("subscription_tier, plus_expires_at")
      .eq("user_id", userId)
      .single();
    return resolveTier(data as SubRow | null);
  } catch {
    // Fail to the safe default. (Enforcement is off in Phase 1 anyway.)
    return "free";
  }
}

export async function countSavedRecipes(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

// ── Gate result ──────────────────────────────────────────────────────────────
// assert* helpers return null when allowed, or a PlusRequired payload to return
// as a 403 when blocked.

export interface GateResult {
  block: ReturnType<typeof plusRequired> | null;
}

const allow: GateResult = { block: null };

/** Block a free user who has hit their saved-recipe cap. */
export async function checkRecipeSaveAllowed(
  supabase: SupabaseClient,
  userId: string,
  tier: Tier,
): Promise<GateResult> {
  if (!ENFORCE_ENTITLEMENTS || tier === "plus") return allow;
  const used = await countSavedRecipes(supabase, userId);
  if (used < FREE_LIMITS.maxSavedRecipes) return allow;
  return {
    block: plusRequired(
      "recipes",
      `You've saved ${FREE_LIMITS.maxSavedRecipes} recipes — the Free limit. Upgrade to Marco Plus for unlimited.`,
    ),
  };
}

/** Per-day AI limit, tier-aware. Plus is unlimited (the caller should skip the
 *  existing daily counter entirely). Returns the limit a free user gets, or
 *  null for "no limit — don't count". */
export function aiDailyLimitFor(
  tier: Tier,
  feature: "ai_search" | "ai_discover",
): number | null {
  if (!ENFORCE_ENTITLEMENTS) {
    // Preserve today's behavior exactly: the historical free limits apply to
    // everyone until enforcement turns on.
    return feature === "ai_search" ? FREE_LIMITS.aiSearchPerDay : FREE_LIMITS.aiDiscoverPerDay;
  }
  if (tier === "plus") return null; // unlimited
  const limits = limitsFor("free");
  return feature === "ai_search" ? limits.aiSearchPerDay : limits.aiDiscoverPerDay;
}

/** Convenience for routes that just want a thrown-style block. */
export function gate(feature: GateFeature, message: string) {
  return plusRequired(feature, message);
}
