/**
 * "Cook around" — the onboarding's one list of diets + allergies, and the
 * safety checks over what Marco suggests. Diets reuse the existing dietary
 * engine (DIETARY_FILTERS, stored in user_profiles.dietary_filters); allergies
 * live in user_preferences.allergies.
 *
 * Two layers, both must pass:
 *  1. Explicit allergen/diet TAGS on curated dishes (starters, the taste duel)
 *     — the authoritative safety net, because keyword matching can't know that
 *     a "pita" is wheat or that fresh fettuccine has egg.
 *  2. Ingredient keyword detection — a backstop, and the only check for
 *     free-text allergies a user typed in Profile.
 */
import { findDietaryConflicts } from "@/lib/cook/dietary";

// Diet toggles shown in onboarding — ids are DIETARY_FILTERS ids.
export const DIET_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "no_pork", label: "No pork" },
] as const;

// Allergy chips — the label is what's stored in user_preferences.allergies.
export const ALLERGY_OPTIONS = ["Peanuts", "Tree nuts", "Shellfish", "Fish", "Eggs", "Dairy", "Gluten", "Soy", "Sesame"] as const;

export type FoodTag = "meat" | "pork" | "fish" | "shellfish" | "dairy" | "gluten" | "eggs" | "soy" | "sesame" | "peanuts" | "treenuts";

const DIET_BLOCKS: Record<string, FoodTag[]> = {
  vegetarian: ["meat", "fish", "shellfish"],
  vegan: ["meat", "fish", "shellfish", "dairy", "eggs"],
  pescatarian: ["meat"],
  no_pork: ["pork"],
  dairy_free: ["dairy"],
  gluten_free: ["gluten"],
  no_shellfish: ["shellfish"],
};
// Keys are lower-case so "Tree Nuts" from Profile and "Tree nuts" from
// onboarding are the same allergy.
const ALLERGY_BLOCKS: Record<string, FoodTag[]> = {
  peanuts: ["peanuts"], peanut: ["peanuts"],
  "tree nuts": ["treenuts"], "tree nut": ["treenuts"], nuts: ["treenuts", "peanuts"],
  shellfish: ["shellfish"], fish: ["fish"], eggs: ["eggs"], egg: ["eggs"],
  dairy: ["dairy"], milk: ["dairy"], gluten: ["gluten"], wheat: ["gluten"],
  soy: ["soy"], sesame: ["sesame"],
};

const norm = (a: string) => a.trim().toLowerCase();

/** Every tag this cook can't have, from their diets + allergies. */
export function blockedTags(diets: readonly string[], allergies: readonly string[]): Set<FoodTag> {
  return new Set<FoodTag>([...diets.flatMap((d) => DIET_BLOCKS[d] ?? []), ...allergies.flatMap((a) => ALLERGY_BLOCKS[norm(a)] ?? [])]);
}

/** True when a tagged dish is safe for this cook. */
export function tagsSafe(tags: readonly FoodTag[], diets: readonly string[], allergies: readonly string[]): boolean {
  const blocked = blockedTags(diets, allergies);
  return !tags.some((t) => blocked.has(t));
}

const ALLERGY_TO_FILTER: Record<string, string> = { dairy: "dairy_free", milk: "dairy_free", gluten: "gluten_free", wheat: "gluten_free", shellfish: "no_shellfish" };
const ALLERGY_KEYWORDS: Record<string, string[]> = {
  peanuts: ["peanut", "peanuts", "peanut butter", "groundnut"],
  "tree nuts": ["almond", "almonds", "walnut", "walnuts", "cashew", "cashews", "pecan", "pecans", "pistachio", "pistachios", "hazelnut", "hazelnuts", "macadamia", "pine nut", "pine nuts"],
  fish: ["fish", "fish sauce", "salmon", "tuna", "cod", "halibut", "trout", "bass", "snapper", "tilapia", "mackerel", "sardine", "sardines", "anchovy", "anchovies"],
  eggs: ["egg", "eggs", "yolk", "yolks"],
  soy: ["soy", "soy sauce", "tofu", "edamame", "miso", "tamari", "tempeh", "doubanjiang"],
  sesame: ["sesame", "sesame seeds", "sesame oil", "tahini"],
};
ALLERGY_KEYWORDS.peanut = ALLERGY_KEYWORDS.peanuts;
ALLERGY_KEYWORDS["tree nut"] = ALLERGY_KEYWORDS["tree nuts"];
ALLERGY_KEYWORDS.nuts = [...ALLERGY_KEYWORDS["tree nuts"], ...ALLERGY_KEYWORDS.peanuts];
ALLERGY_KEYWORDS.egg = ALLERGY_KEYWORDS.eggs;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRx = (words: string[]) => new RegExp(`\\b(?:${words.map(escape).join("|")})\\b`, "i");
const KNOWN_RX: Record<string, RegExp> = Object.fromEntries(Object.entries(ALLERGY_KEYWORDS).map(([k, w]) => [k, wordRx(w)]));

/** True when an ingredient name conflicts with the user's diets or allergies. */
export function ingredientConflicts(name: string, diets: readonly string[], allergies: readonly string[]): boolean {
  if (!name) return false;
  const filters = [...diets, ...allergies.map((a) => ALLERGY_TO_FILTER[norm(a)]).filter(Boolean)];
  if (filters.length && findDietaryConflicts(name, filters).length) return true;
  return allergies.some((raw) => {
    const a = norm(raw);
    if (!a) return false;
    if (KNOWN_RX[a]) return KNOWN_RX[a].test(name);
    if (ALLERGY_BLOCKS[a] || ALLERGY_TO_FILTER[a]) return false; // covered by tags/filters
    // A free-text allergy we don't know (e.g. "mustard", "kiwis"): block any
    // ingredient that mentions it, singular or plural. Fail safe, not open.
    const stem = a.endsWith("es") ? a.slice(0, -2) : a.endsWith("s") ? a.slice(0, -1) : a;
    return wordRx([a, stem, `${stem}s`, `${stem}es`]).test(name);
  });
}

/** True when every ingredient is safe for this cook. */
export function isEligible(ingredientNames: readonly string[], diets: readonly string[], allergies: readonly string[]): boolean {
  if (!diets.length && !allergies.length) return true;
  return !ingredientNames.some((n) => ingredientConflicts(n, diets, allergies));
}
