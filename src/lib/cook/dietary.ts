/**
 * Dietary filters — Phase 2.
 *
 * Keyword-based ingredient detection. Cheap and deterministic; runs in the
 * browser on the recipe-detail render path so we never wait on the LLM to
 * decide whether butter is dairy. The aim is "good enough to flag the
 * obvious cases" — when in doubt, we don't flag, and the user can ask
 * Marco for a sub the normal way.
 *
 * Each filter has a name (the toggle label), a short description (shown in
 * the profile UI), and a `detect(name)` predicate that returns true when an
 * ingredient name conflicts with the filter. Detection is case-insensitive
 * and works on whole-word boundaries to avoid e.g. "fishmeal" matching
 * "fish" inside an unrelated word.
 */
export type DietaryFilterId =
  | "vegetarian"
  | "vegan"
  | "dairy_free"
  | "gluten_free"
  | "pescatarian"
  | "no_pork"
  | "no_shellfish"
  | "no_alcohol";

export interface DietaryFilter {
  id: DietaryFilterId;
  label: string;
  description: string;
  /** Returns true if the ingredient name conflicts with this filter. */
  detect: (name: string) => boolean;
}

/** Match any of the given keywords as whole words (case-insensitive). */
function matchAny(keywords: readonly string[]): (name: string) => boolean {
  // Build one regex; whole-word so "ham" doesn't trigger on "graham".
  const pattern = new RegExp(`\\b(?:${keywords.map(escapeForRegex).join("|")})\\b`, "i");
  return (name) => pattern.test(name);
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MEAT_AND_POULTRY = [
  "beef", "steak", "veal", "lamb", "mutton", "goat",
  "pork", "ham", "bacon", "pancetta", "prosciutto", "guanciale",
  "sausage", "chorizo", "salami", "pepperoni",
  "chicken", "turkey", "duck", "goose", "quail",
  "venison", "rabbit",
  "liver", "kidney", "tripe", "sweetbread", "sweetbreads",
  "ground meat", "minced meat",
];

const SEAFOOD = [
  "fish", "salmon", "tuna", "cod", "halibut", "trout", "bass", "snapper",
  "tilapia", "mackerel", "sardine", "sardines", "anchovy", "anchovies",
  "shrimp", "prawn", "prawns", "lobster", "crab", "scallop", "scallops",
  "oyster", "oysters", "clam", "clams", "mussel", "mussels", "octopus",
  "squid", "calamari",
];

const SHELLFISH = [
  "shrimp", "prawn", "prawns", "lobster", "crab", "crawfish", "crayfish",
  "scallop", "scallops", "oyster", "oysters", "clam", "clams",
  "mussel", "mussels",
];

const PORK = [
  "pork", "ham", "bacon", "pancetta", "prosciutto", "guanciale",
  "lard", "speck",
];

const DAIRY = [
  "milk", "cream", "half-and-half", "butter", "buttermilk",
  "cheese", "cheddar", "mozzarella", "parmesan", "parmigiano", "ricotta",
  "feta", "brie", "camembert", "gouda", "manchego", "pecorino",
  "yogurt", "yoghurt", "kefir", "ghee",
  "whey", "casein",
];

const EGGS = ["egg", "eggs", "yolk", "yolks", "egg white", "egg whites"];

const HONEY = ["honey"];

const GLUTEN = [
  "wheat", "flour", "all-purpose flour", "bread flour", "cake flour",
  "barley", "rye", "spelt", "farro", "kamut", "semolina", "couscous",
  "bread", "breadcrumb", "breadcrumbs", "panko",
  "pasta", "spaghetti", "penne", "linguine", "fettuccine", "macaroni",
  "noodle", "noodles",
  "soy sauce",
];

const ALCOHOL = [
  "wine", "red wine", "white wine", "rosé",
  "beer", "ale", "lager", "stout",
  "vodka", "gin", "rum", "whiskey", "whisky", "bourbon", "brandy", "cognac",
  "tequila", "mezcal", "sake",
  "vermouth", "sherry", "marsala", "port",
  "liqueur", "amaretto", "kahlua", "cointreau",
];

export const DIETARY_FILTERS: readonly DietaryFilter[] = [
  {
    id: "vegetarian",
    label: "Vegetarian",
    description: "Flag meat, poultry, and fish.",
    detect: matchAny([...MEAT_AND_POULTRY, ...SEAFOOD]),
  },
  {
    id: "vegan",
    label: "Vegan",
    description: "Flag meat, fish, dairy, eggs, and honey.",
    detect: matchAny([...MEAT_AND_POULTRY, ...SEAFOOD, ...DAIRY, ...EGGS, ...HONEY]),
  },
  {
    id: "pescatarian",
    label: "Pescatarian",
    description: "Flag meat and poultry — fish is fine.",
    detect: matchAny(MEAT_AND_POULTRY),
  },
  {
    id: "dairy_free",
    label: "Dairy-free",
    description: "Flag milk, cheese, butter, yogurt, and other dairy.",
    detect: matchAny(DAIRY),
  },
  {
    id: "gluten_free",
    label: "Gluten-free",
    description: "Flag wheat, barley, rye, and common gluten-containing items.",
    detect: matchAny(GLUTEN),
  },
  {
    id: "no_pork",
    label: "No pork",
    description: "Flag pork, ham, bacon, and other pork products.",
    detect: matchAny(PORK),
  },
  {
    id: "no_shellfish",
    label: "No shellfish",
    description: "Flag shrimp, lobster, crab, and other shellfish.",
    detect: matchAny(SHELLFISH),
  },
  {
    id: "no_alcohol",
    label: "No alcohol",
    description: "Flag wine, beer, and spirits used in cooking.",
    detect: matchAny(ALCOHOL),
  },
];

/** Map a stored filter id back to its definition, or null if unknown. */
export function getDietaryFilter(id: string): DietaryFilter | null {
  return DIETARY_FILTERS.find((f) => f.id === id) ?? null;
}

/**
 * Returns the subset of `activeFilters` that flag the given ingredient.
 * Empty array = no conflict.
 */
export function findDietaryConflicts(
  ingredientName: string,
  activeFilters: readonly string[],
): DietaryFilter[] {
  if (!ingredientName || activeFilters.length === 0) return [];
  const conflicts: DietaryFilter[] = [];
  for (const id of activeFilters) {
    const filter = getDietaryFilter(id);
    if (filter && filter.detect(ingredientName)) conflicts.push(filter);
  }
  return conflicts;
}
