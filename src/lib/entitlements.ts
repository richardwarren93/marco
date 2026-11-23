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
// Enforcement stays OFF until Plus is actually purchasable. Gate helpers no-op
// while false.
//
// It was switched on in 6d50714 (2026-09-01, "enable paywall + entitlement
// enforcement (go live)") on the assumption that the buying half shipped in the
// same release. It did not: as of 2026-11-23 nothing renders PlusPaywallScreen,
// PlusHookScreen, PlusCompareScreen or TrialReminderScreen, nothing handles the
// `plus_required` 403, and RevenueCat is configured without a purchase flow —
// only "Restore purchases". So every user who reached 25 saved recipes was told
// to upgrade to something they had no way to buy, and simply could not save
// another recipe.
//
// Before setting this to true again, check all three: a reachable paywall, a
// client that catches `plus_required`, and a working purchase.
export const ENFORCE_ENTITLEMENTS = false;

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
