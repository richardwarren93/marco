import type { Ingredient } from "@/types";

type UnitSystem = "us" | "metric";

// Parse amount strings like "1/2", "1 1/2", "0.5", "2"
export function parseAmount(amount: string): number {
  if (!amount) return 0;
  const trimmed = amount.trim();

  // Mixed fraction: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Simple fraction: "1/2"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }

  // Decimal or integer
  const num = parseFloat(trimmed);
  return isNaN(num) ? 0 : num;
}

// Format a number nicely — fractions for US, decimals for metric
export function formatAmount(amount: number, system: UnitSystem = "us"): string {
  if (amount === 0) return "0";

  if (system === "metric") {
    if (amount >= 100) return Math.round(amount).toString();
    if (amount >= 10) return (Math.round(amount * 10) / 10).toString();
    return (Math.round(amount * 100) / 100).toString();
  }

  // US: use fractions where possible
  const whole = Math.floor(amount);
  const frac = amount - whole;

  const fractions: [number, string][] = [
    [1 / 8, "1/8"],
    [1 / 4, "1/4"],
    [1 / 3, "1/3"],
    [3 / 8, "3/8"],
    [1 / 2, "1/2"],
    [5 / 8, "5/8"],
    [2 / 3, "2/3"],
    [3 / 4, "3/4"],
    [7 / 8, "7/8"],
  ];

  if (frac < 0.05) {
    return whole.toString();
  }

  // Find closest fraction
  let closest = "";
  let minDiff = Infinity;
  for (const [val, label] of fractions) {
    const diff = Math.abs(frac - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = label;
    }
  }

  if (minDiff < 0.05) {
    return whole > 0 ? `${whole} ${closest}` : closest;
  }

  // Fall back to decimal
  return (Math.round(amount * 100) / 100).toString();
}

// Scale an amount string by a multiplier
export function scaleAmount(amount: string, multiplier: number, system: UnitSystem = "us"): string {
  if (!amount) return amount;
  const parsed = parseAmount(amount);
  if (parsed === 0) return amount;
  return formatAmount(parsed * multiplier, system);
}

// Unit normalization
function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  const aliases: Record<string, string> = {
    cup: "cups",
    tablespoon: "tablespoons",
    tablespoons: "tablespoons",
    tbsp: "tablespoons",
    tbs: "tablespoons",
    teaspoon: "teaspoons",
    teaspoons: "teaspoons",
    tsp: "teaspoons",
    ounce: "ounces",
    ounces: "ounces",
    oz: "ounces",
    pound: "pounds",
    pounds: "pounds",
    lb: "pounds",
    lbs: "pounds",
    "fluid ounce": "fluid ounces",
    "fluid ounces": "fluid ounces",
    "fl oz": "fluid ounces",
    gram: "grams",
    grams: "grams",
    g: "grams",
    kilogram: "kilograms",
    kilograms: "kilograms",
    kg: "kilograms",
    milliliter: "milliliters",
    milliliters: "milliliters",
    ml: "milliliters",
    liter: "liters",
    liters: "liters",
    l: "liters",
  };
  return aliases[lower] || lower;
}

// Conversion definitions: US → Metric
const conversions: Record<string, { to: string; factor: number }> = {
  cups: { to: "mL", factor: 236.6 },
  tablespoons: { to: "mL", factor: 14.8 },
  teaspoons: { to: "mL", factor: 4.9 },
  ounces: { to: "g", factor: 28.35 },
  pounds: { to: "g", factor: 453.6 },
  "fluid ounces": { to: "mL", factor: 29.6 },
};

// Reverse conversions: Metric → US
const reverseConversions: Record<string, { to: string; factor: number }> = {};
for (const [usUnit, { to, factor }] of Object.entries(conversions)) {
  // Group mL sources → use the most common (cups)
  if (!reverseConversions[to.toLowerCase()]) {
    reverseConversions[to.toLowerCase()] = { to: usUnit, factor: 1 / factor };
  }
}
// Add specific metric → US mappings
reverseConversions["ml"] = { to: "cups", factor: 1 / 236.6 };
reverseConversions["milliliters"] = { to: "cups", factor: 1 / 236.6 };
reverseConversions["l"] = { to: "cups", factor: 1000 / 236.6 };
reverseConversions["liters"] = { to: "cups", factor: 1000 / 236.6 };
reverseConversions["g"] = { to: "oz", factor: 1 / 28.35 };
reverseConversions["grams"] = { to: "oz", factor: 1 / 28.35 };
reverseConversions["kg"] = { to: "lbs", factor: 1 / 0.4536 };
reverseConversions["kilograms"] = { to: "lbs", factor: 1 / 0.4536 };

// Detect if a unit is US or metric
function detectUnitSystem(unit: string): UnitSystem | null {
  const normalized = normalizeUnit(unit);
  if (conversions[normalized]) return "us";
  if (reverseConversions[normalized]) return "metric";
  return null;
}

// Convert a single ingredient to the target unit system
export function convertIngredient(
  ingredient: Ingredient,
  targetSystem: UnitSystem,
  multiplier: number = 1
): Ingredient {
  if (!ingredient.amount || !ingredient.unit) {
    return {
      ...ingredient,
      amount: ingredient.amount ? scaleAmount(ingredient.amount, multiplier, targetSystem) : ingredient.amount,
    };
  }

  const parsed = parseAmount(ingredient.amount);
  if (parsed === 0) return ingredient;

  const scaled = parsed * multiplier;
  const normalized = normalizeUnit(ingredient.unit);
  const sourceSystem = detectUnitSystem(ingredient.unit);

  // If unit has no known system or already in target system, just scale
  if (!sourceSystem || sourceSystem === targetSystem) {
    return {
      ...ingredient,
      amount: formatAmount(scaled, targetSystem),
    };
  }

  // Convert
  const conversionMap = targetSystem === "metric" ? conversions : reverseConversions;
  const conversion = conversionMap[normalized];

  if (!conversion) {
    return {
      ...ingredient,
      amount: formatAmount(scaled, targetSystem),
    };
  }

  const convertedAmount = scaled * conversion.factor;

  return {
    ...ingredient,
    amount: formatAmount(convertedAmount, targetSystem),
    unit: conversion.to,
  };
}
