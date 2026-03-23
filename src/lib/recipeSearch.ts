import type { Recipe } from "@/types";

/**
 * Returns true if strings `a` and `b` differ by at most 1 edit
 * (substitution, insertion, or deletion). Only called for words ≥ 4 chars.
 */
function withinEditDistance1(a: string, b: string): boolean {
  if (a === b) return true;
  const diff = a.length - b.length;
  if (diff > 1 || diff < -1) return false;

  // Same length → allow 1 substitution
  if (diff === 0) {
    let mismatches = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i] && ++mismatches > 1) return false;
    }
    return true;
  }

  // Length differs by 1 → allow 1 insertion/deletion
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
 * common punctuation so "herb-crusted" → ["herb", "crusted"].
 */
function tokenise(text: string): string[] {
  return text.toLowerCase().split(/[\s,.()\-/]+/).filter(Boolean);
}

/**
 * Checks whether a single query word matches any word in the token list.
 * - Short words (< 4 chars): exact substring of the full text only.
 * - Longer words: exact substring first (fast path), then fuzzy word match.
 */
function wordMatches(qWord: string, textWords: string[], fullText: string): boolean {
  if (fullText.includes(qWord)) return true; // exact substring anywhere (fast path)
  if (qWord.length < 4) return false;        // no fuzzy for short tokens
  return textWords.some((tw) => withinEditDistance1(qWord, tw));
}

/**
 * Main search predicate. Returns true if every query word is found
 * (exactly or fuzzily) in the recipe's title, tags, ingredient names,
 * or description.
 */
export function recipeMatchesQuery(recipe: Recipe, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const queryWords = tokenise(q);
  if (queryWords.length === 0) return true;

  // Build the full searchable text blob
  const ingredientNames = (recipe.ingredients ?? []).map((i) => i.name).join(" ");
  const fullText = [
    recipe.title,
    (recipe.tags ?? []).join(" "),
    ingredientNames,
    recipe.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const textWords = tokenise(fullText);

  // Every query word must match something in the recipe
  return queryWords.every((qw) => wordMatches(qw, textWords, fullText));
}
