import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

const VALID_CATEGORIES = [
  "produce", "protein", "dairy", "pantry", "spice",
  "frozen", "bakery", "canned", "condiment", "other",
] as const;
type Category = typeof VALID_CATEGORIES[number];

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

/**
 * Third-pass fallback for ingredient categorization. Looks up a DB cache
 * first, then asks Claude Haiku for any cache misses, then writes the AI
 * answers back to the cache so we never pay twice.
 *
 * Best-effort: any failure (missing migration table, AI timeout, malformed
 * response) returns whatever was successfully resolved without throwing.
 */
export async function categorizeUnknown(
  admin: SupabaseClient,
  rawNames: string[]
): Promise<Map<string, Category>> {
  const result = new Map<string, Category>();
  if (rawNames.length === 0) return result;

  const lowered = [...new Set(rawNames.map((n) => n.toLowerCase().trim()).filter(Boolean))];

  // Pass A — DB cache
  try {
    const { data: cached } = await admin
      .from("ingredient_categories")
      .select("name, category")
      .in("name", lowered);
    for (const row of cached ?? []) {
      if (isCategory(row.category)) result.set(row.name, row.category);
    }
  } catch {
    // Cache table not yet migrated — proceed to AI for everything.
  }

  const uncached = lowered.filter((n) => !result.has(n));
  if (uncached.length === 0) return result;

  // Pass B — Claude Haiku (single batched call)
  const aiResults = await classifyWithHaiku(uncached);
  for (const [name, category] of aiResults) result.set(name, category);

  // Pass C — write back to cache (best-effort)
  if (aiResults.size > 0) {
    const rows = [...aiResults.entries()].map(([name, category]) => ({
      name,
      category,
      source: "ai" as const,
    }));
    await admin
      .from("ingredient_categories")
      .upsert(rows, { onConflict: "name" })
      .then(() => {}, () => {}); // silently swallow if migration not run
  }

  return result;
}

async function classifyWithHaiku(names: string[]): Promise<Map<string, Category>> {
  const result = new Map<string, Category>();
  if (names.length === 0) return result;

  // Format as numbered list so the model can reference items by index — more
  // robust than name-as-key (handles duplicates, apostrophes, parens, etc.)
  const numbered = names.map((n, i) => `${i + 1}. ${n}`).join("\n");

  let response;
  try {
    response = await anthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        `You categorize grocery ingredients into shopping aisles. ` +
        `Respond with a JSON array of category strings — one per ingredient, in the same order as the input. ` +
        `Valid categories ONLY: ${VALID_CATEGORIES.join(", ")}. ` +
        `If unsure, use "other". No prose, no explanations, JSON array only.`,
      messages: [
        {
          role: "user",
          content: `Categorize each ingredient. Output a JSON array of ${names.length} category strings.\n\n${numbered}`,
        },
      ],
    });
  } catch (err) {
    console.error("ingredientCategorizer: Haiku call failed", err);
    return result;
  }

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("ingredientCategorizer: Haiku returned non-JSON:", cleaned.slice(0, 200));
    return result;
  }

  if (!Array.isArray(parsed) || parsed.length !== names.length) {
    console.error("ingredientCategorizer: Haiku returned wrong shape", parsed);
    return result;
  }

  for (let i = 0; i < names.length; i++) {
    const cat = String(parsed[i] ?? "").toLowerCase().trim();
    if (isCategory(cat)) result.set(names[i], cat);
  }
  return result;
}

function isCategory(s: unknown): s is Category {
  return typeof s === "string" && (VALID_CATEGORIES as readonly string[]).includes(s);
}
