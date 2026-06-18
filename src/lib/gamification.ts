import type { PetMood } from "@/types";

export const TOMATO_REWARDS = {
  COOKED_RECIPE: 10,
  COMMUNITY_NOTE: 5,
  WEEKLY_GOAL_COMPLETE: 25,
  FEED_PET_COST: 15,
  // New earning actions (value-prop aligned)
  ADDED_TO_MEAL_PLAN: 5,
  FRIEND_INVITE_ACCEPTED: 25,
  RECIPE_RATING: 5,
  RECIPE_PHOTO: 10,
} as const;

/** Every reason value allowed in tomato_transactions.reason (mirrors the DB CHECK). */
export type TomatoReason =
  | "cooked_recipe"
  | "community_note"
  | "weekly_goal_complete"
  | "feed_pet"
  | "added_to_meal_plan"
  | "friend_invite_accepted"
  | "recipe_rating"
  | "recipe_photo";

/**
 * Max times per UTC day a given reason can award tomatoes. Volume-friendly anti-farm:
 * repeat earns are allowed up to the cap, then awarding silently stops. Reasons absent
 * here (community_note, weekly_goal_complete, feed_pet) are uncapped by this mechanism.
 */
export const TOMATO_DAILY_CAPS: Partial<Record<TomatoReason, number>> = {
  added_to_meal_plan: 10,
  cooked_recipe: 5,
  recipe_rating: 10,
  recipe_photo: 5,
  friend_invite_accepted: 10,
};

/** Human label + icon per reason, for the tomato history view. */
export const TOMATO_REASON_META: Record<TomatoReason, { label: string; icon: string }> = {
  cooked_recipe: { label: "Cooked a recipe", icon: "🍳" },
  community_note: { label: "Left a note", icon: "📝" },
  weekly_goal_complete: { label: "Hit your weekly goal", icon: "🎯" },
  feed_pet: { label: "Fed Marco Jr", icon: "🐾" },
  added_to_meal_plan: { label: "Added to meal plan", icon: "📅" },
  friend_invite_accepted: { label: "A friend joined", icon: "👋" },
  recipe_rating: { label: "Rated a recipe", icon: "⭐" },
  recipe_photo: { label: "Added a photo", icon: "📸" },
};

/** Returns Monday 00:00 UTC of the current ISO week */
export function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Compute effective pet mood from stored hunger level and last_fed_at */
export function computePetMood(hungerLevel: number, lastFedAt: string): PetMood {
  const hoursSinceFed = (Date.now() - new Date(lastFedAt).getTime()) / (1000 * 60 * 60);
  const decay = Math.floor(hoursSinceFed / 24);
  const effective = Math.max(0, hungerLevel - decay);

  if (effective >= 4) return "happy";
  if (effective === 3) return "content";
  if (effective === 2) return "hungry";
  if (effective === 1) return "sad";
  return "very_sad";
}

/** Compute effective hunger level (number) */
export function computeEffectiveHunger(hungerLevel: number, lastFedAt: string): number {
  const hoursSinceFed = (Date.now() - new Date(lastFedAt).getTime()) / (1000 * 60 * 60);
  const decay = Math.floor(hoursSinceFed / 24);
  return Math.max(0, hungerLevel - decay);
}

/** Format a timestamp as relative time string */
export function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Format week start as readable label */
export function weekLabel(weekStart: Date): string {
  return `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
