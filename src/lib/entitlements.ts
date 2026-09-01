// Marco Plus entitlements — the single source of truth for free-tier limits and
// what Plus unlocks. Safe to import from both client and server (no server-only
// deps). Packaging = "volume + convenience": Free caps saved recipes, meal-plan
// reach, grocery automation, Sous Chef sessions and AI usage; Plus removes the
// caps and adds grocery cash-back.
//
// See also: src/lib/entitlements-server.ts (DB reads + gate helpers) and
// src/components/onboarding/paywall/plus-config.ts (the paywall copy/pricing).

export type Tier = "free" | "plus";

// ── Master switch ───────────────────────────────────────────────────────────
// Phase 1 ships with enforcement OFF so existing free users are not retroactively
// capped before Plus is purchasable. Phase 2 (RevenueCat) flips this to true the
// same release that makes the trial buyable. Gate helpers no-op while false.
export const ENFORCE_ENTITLEMENTS = true;

export interface TierLimits {
  /** Max recipes a user can save. */
  maxSavedRecipes: number;
  /** How many weeks past the current week meal plans may reach. 0 = this week
   *  only; Infinity = unlimited. */
  mealPlanWeeksAhead: number;
  /** Auto-built grocery list from the plan + cash-back. */
  groceryAutoBuild: boolean;
  /** Cook-with-Sous-Chef sessions per calendar month. */
  sousChefPerMonth: number;
  /** AI semantic search calls per day. */
  aiSearchPerDay: number;
  /** AI "Discover" recipe generations per day. */
  aiDiscoverPerDay: number;
}

export const FREE_LIMITS: TierLimits = {
  maxSavedRecipes: 25,
  mealPlanWeeksAhead: 0,
  groceryAutoBuild: false,
  sousChefPerMonth: 3,
  aiSearchPerDay: 25,
  aiDiscoverPerDay: 10,
};

export const PLUS_LIMITS: TierLimits = {
  maxSavedRecipes: Infinity,
  mealPlanWeeksAhead: Infinity,
  groceryAutoBuild: true,
  sousChefPerMonth: Infinity,
  aiSearchPerDay: Infinity,
  aiDiscoverPerDay: Infinity,
};

export function limitsFor(tier: Tier): TierLimits {
  return tier === "plus" ? PLUS_LIMITS : FREE_LIMITS;
}

export function isPlus(tier: Tier): boolean {
  return tier === "plus";
}

// ── Gates ───────────────────────────────────────────────────────────────────
// Stable identifiers returned in a 403 body so the client can pop the right
// contextual paywall ("you've hit your saved-recipe limit", etc.).
export type GateFeature =
  | "recipes"
  | "meal_plan"
  | "grocery"
  | "sous_chef"
  | "ai_search"
  | "ai_discover";

export interface PlusRequired {
  error: "plus_required";
  feature: GateFeature;
  message: string;
}

export function plusRequired(feature: GateFeature, message: string): PlusRequired {
  return { error: "plus_required", feature, message };
}

/** JSON can't carry Infinity (serializes to null). Use this when sending limits
 *  to the client so "unlimited" round-trips as null. */
export function serializeLimits(limits: TierLimits): Record<string, number | boolean | null> {
  return {
    maxSavedRecipes: Number.isFinite(limits.maxSavedRecipes) ? limits.maxSavedRecipes : null,
    mealPlanWeeksAhead: Number.isFinite(limits.mealPlanWeeksAhead) ? limits.mealPlanWeeksAhead : null,
    groceryAutoBuild: limits.groceryAutoBuild,
    sousChefPerMonth: Number.isFinite(limits.sousChefPerMonth) ? limits.sousChefPerMonth : null,
    aiSearchPerDay: Number.isFinite(limits.aiSearchPerDay) ? limits.aiSearchPerDay : null,
    aiDiscoverPerDay: Number.isFinite(limits.aiDiscoverPerDay) ? limits.aiDiscoverPerDay : null,
  };
}
