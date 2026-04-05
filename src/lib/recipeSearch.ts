import type { Recipe } from "@/types";

// ─── Synonym Map ───────────────────────────────────────────────────────────────
// Bidirectional: searching "drink" also matches "cocktail", "smoothie", etc.
// Built from real DB recipes + anticipated user search terms.
const SYNONYM_GROUPS: string[][] = [
  // Drinks / Beverages
  ["drink", "cocktail", "beverage", "smoothie", "juice", "fresca", "tea", "coffee", "lemonade", "agua", "hot drink", "soda", "milkshake", "latte", "espresso", "chai"],

  // Proteins
  ["meat", "chicken", "beef", "pork", "lamb", "goat", "sausage", "bacon", "turkey", "poultry"],
  ["steak", "beef", "ribeye", "sirloin"],
  ["shrimp", "prawn", "seafood"],
  ["fish", "salmon", "mackerel", "swordfish", "sardine", "seafood", "cod", "tilapia", "tuna", "trout"],
  ["seafood", "fish", "shrimp", "prawn", "scallop", "sardine", "salmon", "crab", "lobster", "mussel", "clam"],
  ["egg", "eggs", "omelette", "omelet", "scramble", "frittata"],
  ["tofu", "bean curd"],

  // Noodles / Pasta / Grains
  ["noodle", "noodles", "pasta", "ramen", "udon", "soba", "lo mein", "spaghetti", "fettuccine", "penne", "orzo", "linguine", "macaroni"],
  ["rice", "grain", "pilaf", "risotto", "fried rice", "porridge", "congee", "biryani", "paella"],

  // Common dish types
  ["curry", "masala", "stew", "dal", "dhal", "daal"],
  ["taco", "tacos", "burrito", "wrap", "tortilla", "quesadilla", "enchilada", "fajita"],
  ["burger", "cheeseburger", "patty", "smash burger", "hamburger"],
  ["pizza", "flatbread", "pie"],
  ["bowl", "grain bowl", "poke", "buddha bowl", "power bowl"],
  ["stir fry", "stir-fry", "stirfry", "wok"],
  ["soup", "stew", "broth", "brothy", "chili", "chowder", "bisque", "porridge", "congee"],
  ["salad", "slaw", "coleslaw"],
  ["sandwich", "wrap", "flatbread", "burger", "quesadilla", "sub", "panini", "hoagie"],
  ["appetizer", "snack", "finger food", "starter", "nibble", "bite", "canape", "hors d'oeuvre"],
  ["bread", "flatbread", "naan", "rolls", "paratha", "tortilla", "baguette", "focaccia", "pita", "sourdough"],
  ["dessert", "cake", "cookies", "cookie", "mousse", "pudding", "tiramisu", "sweet", "biscotti", "brownie", "pie", "tart", "pastry", "treat", "ice cream"],

  // Cuisines
  ["asian", "chinese", "japanese", "korean", "thai", "vietnamese", "sichuan", "szechuan", "cantonese", "filipino"],
  ["indian", "bengali", "rajasthani", "tandoori", "masala", "dal", "paneer", "biryani", "tikka", "naan"],
  ["italian", "pasta", "pizza", "tuscan", "tiramisu", "risotto", "gnocchi", "bruschetta"],
  ["mexican", "tacos", "taco", "quesadilla", "burrito", "enchilada", "fajita", "salsa", "guacamole"],
  ["chinese", "sichuan", "szechuan", "cantonese", "wok", "dim sum", "dumpling"],
  ["greek", "mediterranean"],
  ["mediterranean", "greek", "turkish", "lebanese", "middle eastern"],
  ["middle eastern", "lebanese", "syrian", "turkish", "mediterranean", "za'atar", "hummus", "falafel"],
  ["french", "bistro", "provencal", "crepe"],
  ["american", "bbq", "southern", "classic", "diner"],
  ["korean", "kimchi", "gochujang", "bibimbap"],
  ["japanese", "ramen", "sushi", "teriyaki", "udon", "miso"],
  ["thai", "pad thai", "green curry", "coconut curry"],
  ["bbq", "barbecue", "grilled", "smoked", "brisket", "ribs"],

  // Meal timing
  ["breakfast", "brunch", "morning"],
  ["lunch", "midday"],
  ["dinner", "supper", "entree", "main", "main course"],
  ["snack", "bite", "nibble", "appetizer", "munchie"],

  // Diet / Lifestyle
  ["vegetarian", "veggie", "meatless"],
  ["vegan", "plant-based", "plant based", "dairy-free"],
  ["gluten-free", "gluten free", "celiac", "gf", "coeliac"],
  ["keto", "low-carb", "low carb", "ketogenic"],
  ["paleo", "whole30", "primal"],
  ["protein", "high-protein", "high protein", "protein-rich"],
  ["low calorie", "low-calorie", "light", "diet", "low-cal"],
  ["dairy free", "dairy-free", "non-dairy", "lactose free", "lactose-free"],
  ["healthy", "nutritious", "wholesome", "clean eating", "balanced"],

  // Cooking methods
  ["grilled", "grill", "bbq", "barbecue", "charred"],
  ["baked", "roasted", "oven", "oven-baked"],
  ["fried", "crispy", "pan-fried", "deep-fried", "deep fried"],
  ["slow cooker", "crockpot", "crock pot", "slow-cooked", "braised"],
  ["instant pot", "pressure cooker", "pressure-cooker"],
  ["air fryer", "air-fryer", "air-fried", "air fried"],
  ["one pot", "one-pot", "one pan", "one-pan", "sheet pan", "sheet-pan"],
  ["no cook", "no-cook", "raw", "no bake", "no-bake"],
  ["stir fry", "stir-fry", "sauteed", "saute"],

  // Occasions
  ["party", "entertaining", "hosting", "gathering", "potluck"],
  ["holiday", "christmas", "thanksgiving", "easter", "festive", "new year"],
  ["date night", "romantic", "fancy", "impressive", "elegant"],
  ["kid", "kid-friendly", "kids", "family", "family-friendly", "children", "child-friendly"],
  ["meal prep", "meal-prep", "batch cooking", "make-ahead", "make ahead", "freezer-friendly", "freezer friendly"],

  // Flavors / Descriptors
  ["spicy", "hot", "chili", "chilli", "mala", "gochujang", "harissa", "sriracha", "jalapeno", "habanero"],
  ["creamy", "rich", "cheesy", "saucy", "velvety"],
  ["fresh", "light", "crisp", "raw", "clean", "refreshing"],
  ["warm", "cozy", "hearty", "warming", "winter", "comfort", "comfort food", "comforting"],
  ["cold", "chilled", "cool", "refreshing", "summer", "frozen"],
  ["sweet", "dessert", "treat", "sugary"],
  ["savory", "savoury", "umami", "salty"],
  ["smoky", "smoked", "charred"],
  ["tangy", "tart", "sour", "citrus", "vinegar"],
  ["quick", "easy", "fast", "simple", "10-minute", "15-minute", "30-minute", "weeknight", "under 30"],
];

// Build a lookup: word → Set of all its synonyms
const synonymLookup: Map<string, Set<string>> = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    const lower = word.toLowerCase();
    if (!synonymLookup.has(lower)) {
      synonymLookup.set(lower, new Set());
    }
    for (const other of group) {
      const otherLower = other.toLowerCase();
      if (otherLower !== lower) {
        synonymLookup.get(lower)!.add(otherLower);
      }
    }
  }
}

/**
 * Given a query word, return all synonym expansions (including the original).
 */
function expandWithSynonyms(word: string): string[] {
  const synonyms = synonymLookup.get(word);
  if (!synonyms) return [word];
  return [word, ...synonyms];
}

/**
 * Returns true if strings `a` and `b` differ by at most 1 edit
 * (substitution, insertion, or deletion). Only called for words >= 4 chars.
 */
function withinEditDistance1(a: string, b: string): boolean {
  if (a === b) return true;
  const diff = a.length - b.length;
  if (diff > 1 || diff < -1) return false;

  // Same length -> allow 1 substitution
  if (diff === 0) {
    let mismatches = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i] && ++mismatches > 1) return false;
    }
    return true;
  }

  // Length differs by 1 -> allow 1 insertion/deletion
  const [longer, shorter] = diff > 0 ? [a, b] : [b, a];
  let i = 0, j = 0, skipped = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] !== shorter[j]) {
      if (++skipped > 1) return false;
      i++; // skip one char in the longer string
    } else {
      i++; j++;
    }
  }
  return true;
}

/**
 * Tokenises a string into lowercase words, splitting on whitespace and
 * common punctuation so "herb-crusted" -> ["herb", "crusted"].
 */
function tokenise(text: string): string[] {
  return text.toLowerCase().split(/[\s,.()\-/]+/).filter(Boolean);
}

/**
 * Checks whether a single query word (or any of its synonyms) matches
 * any word in the token list.
 * - Short words (< 4 chars): exact substring of the full text only.
 * - Longer words: exact substring first (fast path), then fuzzy word match.
 */
function wordMatchesWithSynonyms(qWord: string, textWords: string[], fullText: string): boolean {
  // Expand the query word to include all synonyms
  const candidates = expandWithSynonyms(qWord);

  for (const candidate of candidates) {
    // Exact substring match (fast path)
    if (fullText.includes(candidate)) return true;

    // For multi-word synonyms like "comfort food", check as phrase
    if (candidate.includes(" ") && fullText.includes(candidate)) return true;

    // No fuzzy for short tokens
    if (candidate.length < 4) continue;

    // Fuzzy match against individual words
    if (textWords.some((tw) => withinEditDistance1(candidate, tw))) return true;
  }

  return false;
}

/**
 * Main search predicate. Returns true if every query word is found
 * (exactly, fuzzily, or via synonym) in the recipe's title, tags,
 * ingredient names, meal_type, or description.
 */
export function recipeMatchesQuery(recipe: Recipe, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const queryWords = tokenise(q);
  if (queryWords.length === 0) return true;

  // Build the full searchable text blob (now includes meal_type)
  const ingredientNames = (recipe.ingredients ?? []).map((i) => i.name).join(" ");
  const fullText = [
    recipe.title,
    (recipe.tags ?? []).join(" "),
    ingredientNames,
    recipe.description ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((recipe as any).meal_type as string) ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const textWords = tokenise(fullText);

  // Every query word must match something in the recipe (with synonym expansion)
  return queryWords.every((qw) => wordMatchesWithSynonyms(qw, textWords, fullText));
}
