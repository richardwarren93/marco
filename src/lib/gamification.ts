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
  // Spend: resurrect the mascot once he's died from inactivity.
  REVIVE_PET_COST: 50,
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

/* ── Tomato mascot health ─────────────────────────────────────────────────
 * A living tomato on the /tomatoes screen whose state reflects how consistently
 * the user earns. STRICT DAILY model: earn every day to keep him healthy; each
 * missed UTC day drops him a stage; ~4 idle days and he's gone (always revivable
 * by earning again). Derived purely from the earning ledger — no stored pet state.
 */
export type TomatoHealthState = "thriving" | "happy" | "content" | "wilting" | "dying" | "dead";

export const TOMATO_HEALTH_META: Record<TomatoHealthState, { label: string; message: string }> = {
  thriving: { label: "Thriving", message: "He's glowing — keep the streak alive!" },
  happy: { label: "Happy", message: "Earned today. Come back tomorrow to keep him healthy." },
  content: { label: "Peckish", message: "Earn a tomato today to perk him up." },
  wilting: { label: "Wilting", message: "Two days without tomatoes — he's drooping." },
  dying: { label: "Fading", message: "He's barely hanging on. Earn a tomato today!" },
  dead: { label: "Gone", message: "Earn a tomato to bring him back to life." },
};

/** Days of inactivity before the mascot dies (and the gap that kills him mid-history). */
const TOMATO_DEATH_IDLE = 4;

/**
 * Derive the mascot's health from the user's activity. `earnDates` and `reviveDates`
 * are distinct UTC days (YYYY-MM-DD), newest first.
 *
 * Death LATCHES: once he dies from a 4-day inactivity gap, earning alone does NOT
 * bring him back — only a revive (a paid resurrection) resets him to alive, after
 * which strict-daily decay resumes. The earning streak (for the "thriving" tier and
 * the streak badge) counts consecutive earn-days back from today.
 */
export function deriveTomatoHealth(
  earnDates: string[],
  reviveDates: string[] = [],
): { state: TomatoHealthState; streak: number; daysSinceLastEarn: number | null } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const toMs = (d: string) => Date.parse(d.slice(0, 10) + "T00:00:00Z");
  const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const between = (aMs: number, bMs: number) => Math.round((bMs - aMs) / 86_400_000);

  const earnSet = new Set(earnDates.map((d) => d.slice(0, 10)));
  const events = [
    ...earnDates.map((d) => ({ ms: toMs(d), revive: false })),
    ...reviveDates.map((d) => ({ ms: toMs(d), revive: true })),
  ].sort((a, b) => a.ms - b.ms);

  if (!events.length) return { state: "content", streak: 0, daysSinceLastEarn: null };

  // Walk activity chronologically, tracking alive/dead with latched death.
  let status: "alive" | "dead" = "alive";
  let lastAlive: number | null = null;
  for (const e of events) {
    if (status === "dead") {
      if (e.revive) { status = "alive"; lastAlive = e.ms; }
      // an earn while dead is ignored — no free resurrection
    } else if (lastAlive !== null && between(lastAlive, e.ms) >= TOMATO_DEATH_IDLE && !e.revive) {
      status = "dead"; // died in the gap; this earn does not revive him
    } else {
      status = "alive";
      lastAlive = e.ms;
    }
  }

  const daysSince = lastAlive !== null ? between(lastAlive, todayMs) : null;

  if (status === "dead" || (daysSince !== null && daysSince >= TOMATO_DEATH_IDLE)) {
    return { state: "dead", streak: 0, daysSinceLastEarn: daysSince };
  }

  // Alive — earn streak counting back from today.
  let streak = 0;
  let cur = todayMs;
  while (earnSet.has(dayStr(cur))) {
    streak += 1;
    cur -= 86_400_000;
  }

  const d = daysSince ?? 0;
  let state: TomatoHealthState;
  if (d <= 0) state = streak >= 5 ? "thriving" : "happy";
  else if (d === 1) state = "content";
  else if (d === 2) state = "wilting";
  else state = "dying";

  return { state, streak, daysSinceLastEarn: d };
}

/** Human label + icon per reason, for the tomato history view. */
export const TOMATO_REASON_META: Record<TomatoReason, { label: string; icon: string }> = {
  cooked_recipe: { label: "Cooked a recipe", icon: "🍳" },
  community_note: { label: "Left a note", icon: "📝" },
  weekly_goal_complete: { label: "Hit your weekly goal", icon: "🎯" },
  // feed_pet is reused as the mascot revive spend (the old feed-pet mechanic is retired).
  feed_pet: { label: "Revived your tomato", icon: "🌱" },
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
