// Marco's progression engine — the deterministic bridge from "a real cook
// happened" to "the kitchen visibly changed."
//
// Pure and auditable, mirroring cook-engine.ts: one completed cook + the current
// world state in → the next world state + a narratable list of what changed out.
// NO LLM decides rewards. The completion screen renders `events`; the caller
// persists `skills` (cook_profiles.skills) and `kitchen` (user_profiles
// .kitchen_state). This is the same code path for a real cook AND for the last
// beat of onboarding — onboarding fires it with totalCooks=1 so the first sprout
// is genuinely earned, not a canned preview.

import {
  applySkillGains,
  type SkillId,
  type SkillState,
  type SkillGain,
} from "@/lib/skills";

// ── World state (persisted JSONB, see supabase/migration-kitchen.sql) ────────

export type HerbLevel = 0 | 1 | 2 | 3;

export interface KitchenState {
  active_kitchen: string;
  zones: {
    herb: number;
    stove: number;
    bookshelf: number;
    wall: number;
    counter: number;
    [k: string]: number;
  };
}

export const DEFAULT_KITCHEN: KitchenState = {
  active_kitchen: "starter",
  zones: { herb: 0, stove: 0, bookshelf: 0, wall: 0, counter: 0 },
};

/** Tolerate partial/absent JSONB from older rows. */
export function normalizeKitchen(raw: unknown): KitchenState {
  const r = (raw ?? {}) as Partial<KitchenState>;
  return {
    active_kitchen: r.active_kitchen ?? DEFAULT_KITCHEN.active_kitchen,
    zones: { ...DEFAULT_KITCHEN.zones, ...(r.zones ?? {}) },
  };
}

// ── The herb/window zone rule (consistency → the first transformation) ───────
//
// TRANSFORMATION, not accumulation: one zone, four states, it only ever grows
// (a milestone you earned doesn't un-happen; Marco's *mood* carries the "you've
// been away" signal instead). Thresholds are explicit and configurable so the
// rule is testable and legible.
//   0 → empty sill
//   1 → first sprout        ...your very first cook (also onboarding's payoff)
//   2 → healthy herb        ...the first week you hit your goal
//   3 → full window garden  ...a sustained month of it
export interface HerbInput {
  totalCooks: number; // lifetime completed cooks, INCLUDING this one
  cookedThisWeek: number; // completed this week, INCLUDING this one
  weeklyTarget: number; // cooking_goals.weekly_target
}

export function herbLevelFor({ totalCooks, cookedThisWeek, weeklyTarget }: HerbInput): HerbLevel {
  if (totalCooks <= 0) return 0;
  let level: HerbLevel = 1; // the first cook always earns the sprout
  if (weeklyTarget > 0 && cookedThisWeek >= weeklyTarget) level = 2;
  if (totalCooks >= Math.max(8, Math.max(1, weeklyTarget) * 4)) level = 3;
  return level;
}

// ── Engine I/O ───────────────────────────────────────────────────────────────

export interface ProgressionInput {
  techniques: SkillId[]; // from skills.inferTechniques(recipe)
  priorSkills: SkillState; // cook_profiles.skills
  kitchen: KitchenState; // user_profiles.kitchen_state (normalized)
  totalCooks: number; // lifetime cooked count, INCLUDING this cook
  cookedThisWeek: number; // this week's cooked count, INCLUDING this cook
  weeklyTarget: number;
}

export type ProgressionEvent =
  | { type: "skill"; skill: SkillId; label: string; level: string; experiences: number; leveledUp: boolean }
  | { type: "goal"; cookedThisWeek: number; weeklyTarget: number; hitGoal: boolean; justHit: boolean }
  | { type: "herb"; from: HerbLevel; to: HerbLevel; firstEver: boolean };

export interface ProgressionResult {
  skills: SkillState; // to persist
  kitchen: KitchenState; // to persist
  gains: SkillGain[]; // per-technique detail (superset of the skill events)
  events: ProgressionEvent[]; // ordered narration for the completion screen
  herbChanged: boolean; // did the window zone transform this cook?
}

/**
 * Run one completed cook through the world. Deterministic: same inputs → same
 * outputs, always. Herb level is monotonic (max of current and the rule's
 * target) so a milestone is never revoked.
 */
export function runProgression(input: ProgressionInput): ProgressionResult {
  const { techniques, priorSkills, kitchen, totalCooks, cookedThisWeek, weeklyTarget } = input;

  // 1) Skills — identity progression.
  const { next: skills, gains } = applySkillGains(priorSkills, techniques);

  // 2) Weekly goal — consistency progression.
  const hitGoal = weeklyTarget > 0 && cookedThisWeek >= weeklyTarget;
  const justHit = hitGoal && cookedThisWeek - 1 < weeklyTarget; // crossed the line this cook

  // 3) Herb/window zone — the visible transformation (monotonic).
  const current = normalizeKitchen(kitchen);
  const fromHerb = (current.zones.herb ?? 0) as HerbLevel;
  const target = herbLevelFor({ totalCooks, cookedThisWeek, weeklyTarget });
  const toHerb = (Math.max(fromHerb, target) as HerbLevel);
  const herbChanged = toHerb !== fromHerb;
  const nextKitchen: KitchenState = herbChanged
    ? { ...current, zones: { ...current.zones, herb: toHerb } }
    : current;

  // 4) Narration — ordered for the completion screen: what you *did* (skills),
  // then where you *are* (goal), then what *changed* (herb) as the finale.
  const events: ProgressionEvent[] = [
    ...gains.map(
      (g): ProgressionEvent => ({
        type: "skill",
        skill: g.skill,
        label: g.label,
        level: g.level,
        experiences: g.experiences,
        leveledUp: g.leveledUp,
      })
    ),
    { type: "goal", cookedThisWeek, weeklyTarget, hitGoal, justHit },
  ];
  if (herbChanged) {
    events.push({ type: "herb", from: fromHerb, to: toHerb, firstEver: fromHerb === 0 });
  }

  return { skills, kitchen: nextKitchen, gains, events, herbChanged };
}
