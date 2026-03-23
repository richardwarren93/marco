import { INGREDIENTS } from "@/data/ingredients";
import type { Ingredient, PantryItem } from "@/types";

export interface AggregatedItem {
  name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
  recipeSources: string[];
  inPantry: boolean;
}

// Unit conversion ratios (smaller unit → larger unit)
const VOLUME_CONVERSIONS: Record<string, Record<string, number>> = {
  tsp: { tbsp: 1 / 3, cup: 1 / 48 },
  tbsp: { tsp: 3, cup: 1 / 16 },
  cup: { tbsp: 16, tsp: 48, pint: 1 / 2, quart: 1 / 4, gallon: 1 / 16 },
  pint: { cup: 2, quart: 1 / 2, gallon: 1 / 8 },
  quart: { cup: 4, pint: 2, gallon: 1 / 4 },
  gallon: { cup: 16, quart: 4 },
  ml: { liter: 1 / 1000 },
  liter: { ml: 1000 },
};

const WEIGHT_CONVERSIONS: Record<string, Record<string, number>> = {
  oz: { lb: 1 / 16 },
  lb: { oz: 16 },
};

// Build a name → canonical name + category lookup from ingredients DB
const aliasMap = new Map<string, { canonical: string; category: string }>();
for (const ing of INGREDIENTS) {
  const lower = ing.name.toLowerCase();
  aliasMap.set(lower, { canonical: lower, category: ing.category });
  if (ing.aliases) {
    for (const alias of ing.aliases) {
      aliasMap.set(alias.toLowerCase(), { canonical: lower, category: ing.category });
    }
  }
}

/** Keyword-based fallback when the ingredient isn't in the alias map. */
function keywordCategorize(lower: string): string | null {
  if (/chicken|beef|pork|lamb|turkey|duck|venison|steak|mince|ground meat|sausage|bacon|ham|prawn|shrimp|salmon|tuna|cod|tilapia|halibut|mahi|crab|lobster|clam|mussel|oyster|anchovy|sardine|tofu|tempeh|seitan/.test(lower)) return "protein";
  if (/parmesan|mozzarella|cheddar|gouda|brie|feta|ricotta|goat cheese|cream cheese|cottage cheese|yogurt|sour cream|half.and.half|heavy cream|whipped cream|ghee/.test(lower)) return "dairy";
  if (/vinegar|soy sauce|fish sauce|hot sauce|sriracha|tabasco|worcestershire|ketchup|mayonnaise|mustard|relish/.test(lower)) return "spice";
  if (/salt|pepper|paprika|cumin|turmeric|coriander|oregano|chili|chilli|cayenne|cinnamon|nutmeg|cardamom|saffron|sesame|spice|crisp|seasoning/.test(lower)) return "spice";
  if (/oil|flour|sugar|honey|maple|pasta|noodle|rice|quinoa|oat|lentil|chickpea|bread|cracker|stock|broth|tomato paste|coconut milk|peanut butter|nut butter|almond butter|chocolate|cocoa|baking powder|baking soda|cornstarch|panko|breadcrumb/.test(lower)) return "pantry";
  if (/potato|onion|garlic|ginger|tomato|carrot|celery|lettuce|spinach|kale|broccoli|cauliflower|asparagus|zucchini|cucumber|rosemary|thyme|sage|mint|parsley|cilantro|basil|dill|chive|lemon|lime|orange|apple|banana|berry|mushroom|corn|peas|vegetable|greens|arugula|leek|avocado|eggplant|squash|beet|radish|yam|scallion|fennel|bok choy|cabbage|artichoke|herb/.test(lower)) return "produce";
  if (/frozen|ice cream|sorbet/.test(lower)) return "frozen";
  return null;
}

function normalizeName(name: string): { canonical: string; category: string | null } {
  const lower = name.toLowerCase().trim();
  const found = aliasMap.get(lower);
  if (found) return found;
  // Fallback: keyword-based category guess for unrecognised ingredients
  const category = keywordCategorize(lower);
  return { canonical: lower, category };
}

function parseAmount(amount: string | number | null | undefined): number | null {
  if (amount === null || amount === undefined || amount === "") return null;
  // DB can return numeric values for ingredient amounts
  if (typeof amount === "number") return isNaN(amount) ? null : amount;
  const trimmed = String(amount).trim();

  // Handle fractions like "1/2", "3/4"
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }

  // Handle mixed numbers like "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  const unitMap: Record<string, string> = {
    teaspoon: "tsp",
    teaspoons: "tsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    cups: "cup",
    ounce: "oz",
    ounces: "oz",
    pound: "lb",
    pounds: "lb",
    lbs: "lb",
    pints: "pint",
    quarts: "quart",
    gallons: "gallon",
    liters: "liter",
    litres: "liter",
    milliliters: "ml",
    cloves: "clove",
    heads: "head",
    bunches: "bunch",
    pieces: "piece",
    slices: "slice",
    cans: "can",
    jars: "jar",
    bottles: "bottle",
    packages: "package",
    bags: "bag",
    whole: "count",
    each: "count",
  };
  return unitMap[lower] || lower;
}

function canConvert(unitA: string, unitB: string): number | null {
  // Same unit
  if (unitA === unitB) return 1;

  // Check volume conversions
  if (VOLUME_CONVERSIONS[unitA]?.[unitB]) return VOLUME_CONVERSIONS[unitA][unitB];
  if (VOLUME_CONVERSIONS[unitB]?.[unitA]) return 1 / VOLUME_CONVERSIONS[unitB][unitA];

  // Check weight conversions
  if (WEIGHT_CONVERSIONS[unitA]?.[unitB]) return WEIGHT_CONVERSIONS[unitA][unitB];
  if (WEIGHT_CONVERSIONS[unitB]?.[unitA]) return 1 / WEIGHT_CONVERSIONS[unitB][unitA];

  return null;
}

// Prefer the "larger" unit for display
function preferredUnit(unitA: string, unitB: string): string {
  const volumeOrder = ["tsp", "tbsp", "cup", "pint", "quart", "gallon"];
  const weightOrder = ["oz", "lb"];
  const metricOrder = ["ml", "liter"];

  for (const order of [volumeOrder, weightOrder, metricOrder]) {
    const idxA = order.indexOf(unitA);
    const idxB = order.indexOf(unitB);
    if (idxA >= 0 && idxB >= 0) {
      return idxA > idxB ? unitA : unitB;
    }
  }
  return unitA;
}

function formatAmount(num: number): string {
  // Round to nice fractions
  if (Math.abs(num - Math.round(num)) < 0.01) return Math.round(num).toString();

  const fractions: [number, string][] = [
    [0.25, "1/4"],
    [0.333, "1/3"],
    [0.5, "1/2"],
    [0.667, "2/3"],
    [0.75, "3/4"],
  ];

  const whole = Math.floor(num);
  const frac = num - whole;

  for (const [val, label] of fractions) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  // Fall back to decimal
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

export function aggregateIngredients(
  recipeIngredients: { recipeTitle: string; ingredients: Ingredient[] }[],
  pantryItems: PantryItem[]
): AggregatedItem[] {
  // Step 1: Collect all ingredients with their recipe sources
  const grouped = new Map<
    string,
    {
      entries: { amount: number | null; unit: string; recipeTitle: string }[];
      category: string | null;
    }
  >();

  for (const { recipeTitle, ingredients } of recipeIngredients) {
    for (const ing of ingredients) {
      const { canonical, category } = normalizeName(ing.name);
      const amount = parseAmount(ing.amount);
      const unit = ing.unit ? normalizeUnit(ing.unit) : "";

      if (!grouped.has(canonical)) {
        grouped.set(canonical, { entries: [], category });
      }
      const group = grouped.get(canonical)!;
      if (category && !group.category) group.category = category;
      group.entries.push({ amount, unit, recipeTitle });
    }
  }

  // Step 2: Aggregate quantities
  const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase().trim()));
  const results: AggregatedItem[] = [];

  for (const [name, { entries, category }] of grouped) {
    const recipeSources = [...new Set(entries.map((e) => e.recipeTitle))];
    const inPantry = pantryNames.has(name);

    // Group entries by compatible units
    const unitGroups = new Map<string, number>();
    const unparseable: string[] = [];

    for (const entry of entries) {
      if (entry.amount === null) {
        // Un-parseable amounts — just note the recipe
        unparseable.push(entry.recipeTitle);
        continue;
      }

      if (!entry.unit) {
        // No unit — treat as "count"
        const key = "count";
        unitGroups.set(key, (unitGroups.get(key) || 0) + entry.amount);
        continue;
      }

      // Try to combine with existing groups
      let combined = false;
      for (const [existingUnit, existingAmount] of unitGroups) {
        const conversionFactor = canConvert(entry.unit, existingUnit);
        if (conversionFactor !== null) {
          const preferred = preferredUnit(entry.unit, existingUnit);
          if (preferred === existingUnit) {
            unitGroups.set(existingUnit, existingAmount + entry.amount * conversionFactor);
          } else {
            // Switch to the preferred unit
            const reverseConversion = canConvert(existingUnit, preferred);
            unitGroups.delete(existingUnit);
            unitGroups.set(
              preferred,
              existingAmount * (reverseConversion || 1) + entry.amount * (canConvert(entry.unit, preferred) || 1)
            );
          }
          combined = true;
          break;
        }
      }

      if (!combined) {
        unitGroups.set(entry.unit, (unitGroups.get(entry.unit) || 0) + entry.amount);
      }
    }

    // Build the result
    if (unitGroups.size === 0 && unparseable.length > 0) {
      // All entries are un-parseable
      results.push({ name, amount: "to taste", unit: null, category, recipeSources, inPantry });
    } else if (unitGroups.size === 1) {
      const [unit, amount] = [...unitGroups.entries()][0];
      results.push({
        name,
        amount: formatAmount(amount),
        unit: unit === "count" ? null : unit,
        category,
        recipeSources,
        inPantry,
      });
    } else {
      // Multiple incompatible unit groups — combine into one display string
      const parts = [...unitGroups.entries()].map(
        ([unit, amount]) => `${formatAmount(amount)}${unit === "count" ? "" : ` ${unit}`}`
      );
      results.push({
        name,
        amount: parts.join(" + "),
        unit: null,
        category,
        recipeSources,
        inPantry,
      });
    }
  }

  // Sort: by category, then by name
  const categoryOrder = [
    "produce",
    "protein",
    "dairy",
    "grain",
    "canned",
    "frozen",
    "spice",
    "condiment",
    "other",
  ];

  results.sort((a, b) => {
    const catA = categoryOrder.indexOf(a.category || "other");
    const catB = categoryOrder.indexOf(b.category || "other");
    if (catA !== catB) return catA - catB;
    return a.name.localeCompare(b.name);
  });

  return results;
}
