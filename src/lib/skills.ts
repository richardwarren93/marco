// Marco's skill system — the "identity" progression.
//
// Pure, deterministic technique inference + mastery bookkeeping. NO I/O, NO LLM.
// A completed cook is classified into 1–3 techniques (from the recipe's steps +
// tags), each technique gains one "experience", and enough experiences move it
// up a plain-language mastery label. Mirrors cook-engine.ts: data in → data out;
// the caller persists whatever comes back (cook_profiles.skills JSONB).
//
// Seeded from the same verb families stepParser.ts already recognizes, collapsed
// into a small, legible taxonomy — long lists drift toward false positives, and
// the point here is a line the user believes ("You practiced sautéing"), not a
// culinary ontology.

// ── Taxonomy ─────────────────────────────────────────────────────────────────

export type SkillId =
  | "knife"
  | "saute"
  | "sear"
  | "roast"
  | "simmer"
  | "boil"
  | "grill"
  | "bake"
  | "sauce"
  | "stirfry"
  | "braise"
  | "season";

interface SkillDef {
  id: SkillId;
  /** Shown in the completion screen: "You practiced {label}." */
  label: string;
  /** Verb keywords that count as practicing this technique. */
  keywords: string[];
}

// Order matters: it's the deterministic tie-break when two techniques are
// equally present in a recipe (earlier wins). Roughly prep → heat → finish.
const SKILLS: SkillDef[] = [
  { id: "knife", label: "knife work", keywords: ["chop", "dice", "mince", "slice", "julienne", "peel", "grate", "zest"] },
  { id: "season", label: "seasoning", keywords: ["season", "marinate", "brine", "rub", "salt to taste"] },
  { id: "saute", label: "sautéing", keywords: ["sauté", "saute", "sweat", "soften", "cook until translucent"] },
  { id: "sear", label: "searing", keywords: ["sear", "brown", "caramelize", "char", "blister"] },
  { id: "stirfry", label: "stir-frying", keywords: ["stir-fry", "stir fry", "wok", "toss over high heat"] },
  { id: "roast", label: "roasting", keywords: ["roast"] },
  { id: "bake", label: "baking", keywords: ["bake", "knead", "proof", "dough", "batter", "fold in", "whisk until"] },
  { id: "grill", label: "grilling", keywords: ["grill", "broil", "barbecue"] },
  { id: "boil", label: "boiling", keywords: ["boil", "blanch", "poach", "parboil"] },
  { id: "simmer", label: "simmering", keywords: ["simmer", "stew", "reduce to a simmer"] },
  { id: "braise", label: "braising", keywords: ["braise", "slow-cook", "slow cook"] },
  { id: "sauce", label: "sauce-making", keywords: ["sauce", "deglaze", "reduce", "emulsify", "whisk in", "thicken"] },
];

const BY_ID: Record<SkillId, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillDef>;

export function skillLabel(id: SkillId): string {
  return BY_ID[id]?.label ?? id;
}

// ── Mastery levels ───────────────────────────────────────────────────────────
//
// Experiences → a plain-language label. No XP bar, no points; the label is the
// reward ("you're getting comfortable with searing"). Thresholds are ascending
// and configurable — the engine just finds the highest one you've cleared.

export type SkillLevel = "started" | "practicing" | "comfortable" | "confident" | "experienced";

const LEVEL_THRESHOLDS: { level: SkillLevel; at: number }[] = [
  { level: "started", at: 1 },
  { level: "practicing", at: 2 },
  { level: "comfortable", at: 4 },
  { level: "confident", at: 8 },
  { level: "experienced", at: 15 },
];

export function levelForExperiences(experiences: number): SkillLevel {
  let level: SkillLevel = "started";
  for (const t of LEVEL_THRESHOLDS) if (experiences >= t.at) level = t.level;
  return level;
}

// ── Inference — which techniques did this cook practice? ─────────────────────

export interface InferInput {
  title?: string | null;
  steps?: string[] | null;
  tags?: string[] | null;
}

/**
 * Deterministically pick the 1–3 most salient techniques in a recipe by counting
 * keyword hits across its steps (weighted), tags, and title. Ties break by the
 * SKILLS order above so the same recipe always yields the same techniques —
 * cache the result on the event so the completion screen and history agree.
 */
export function inferTechniques(recipe: InferInput, max = 3): SkillId[] {
  const stepText = (recipe.steps ?? []).join(" \n ").toLowerCase();
  const tagText = (recipe.tags ?? []).join(" ").toLowerCase();
  const titleText = (recipe.title ?? "").toLowerCase();

  const scored = SKILLS.map((s) => {
    let hits = 0;
    for (const kw of s.keywords) {
      if (stepText.includes(kw)) hits += 2; // steps are the strongest signal
      if (tagText.includes(kw)) hits += 1;
      if (titleText.includes(kw)) hits += 1;
    }
    return { id: s.id, hits };
  }).filter((x) => x.hits > 0);

  // Highest hit-count first; SKILLS order (stable sort input) breaks ties.
  scored.sort((a, b) => b.hits - a.hits);
  const picked = scored.slice(0, max).map((x) => x.id);

  // Never leave a real cook feeling like "nothing happened" — every meal at
  // least exercises knife work + seasoning. This keeps the reward honest-ish
  // without over-claiming a technique that wasn't in the recipe.
  if (picked.length === 0) return ["knife"];
  return picked;
}

// ── Mastery bookkeeping (pure) ───────────────────────────────────────────────

export interface SkillEntry {
  experiences: number;
  level: SkillLevel;
}
/** Persisted shape: cook_profiles.skills JSONB — { "<skill>": { experiences, level } }. */
export type SkillState = Partial<Record<SkillId, SkillEntry>>;

export interface SkillGain {
  skill: SkillId;
  label: string;
  experiences: number;
  level: SkillLevel;
  /** True when THIS cook crossed a mastery threshold (a moment worth narrating). */
  leveledUp: boolean;
}

/**
 * Apply one cook's techniques to the prior skill state. Returns the next state
 * plus a per-technique gain summary (with level-up flags) for the completion
 * screen. Pure — caller persists `next`.
 */
export function applySkillGains(prior: SkillState, techniques: SkillId[]): { next: SkillState; gains: SkillGain[] } {
  const next: SkillState = { ...prior };
  const gains: SkillGain[] = [];
  for (const skill of techniques) {
    const before = prior[skill];
    const experiences = (before?.experiences ?? 0) + 1;
    const level = levelForExperiences(experiences);
    next[skill] = { experiences, level };
    gains.push({
      skill,
      label: skillLabel(skill),
      experiences,
      level,
      leveledUp: level !== (before?.level ?? null),
    });
  }
  return { next, gains };
}
