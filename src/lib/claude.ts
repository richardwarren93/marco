import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient, Recipe, PantryItem } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function extractRecipe(
  scrapedContent: string,
  sourceUrl: string
): Promise<Partial<Recipe>> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are a recipe extraction assistant. You ALWAYS respond with valid JSON only — no explanations, no apologies, no markdown. Even if the content is minimal, vague, or incomplete, you must return a JSON object with your best interpretation. Never refuse. Never say "I cannot". Always produce JSON.

CRITICAL: Social media recipe posts (especially Instagram Reels and TikTok) often have very limited scrapeable text. When the content is minimal:
- Use hashtags, captions, author names, and any clues to identify the dish
- If you can identify the dish name, provide a reasonable set of common ingredients and basic cooking steps for that dish
- Extract any mentioned ingredients or techniques, even from hashtags (e.g. #chickenpasta → chicken, pasta)
- Make your best educated guess about what the recipe is — a reasonable guess is far more useful than empty fields
- NEVER return generic titles like "Instagram Recipe" or "Social Media Recipe" — always try to identify the actual dish`,
    messages: [
      {
        role: "user",
        content: `Extract a recipe from this social media post content. The content may be limited since it was scraped from a video-based social media post.

Source URL: ${sourceUrl}

Scraped Content:
${scrapedContent}

Return a JSON object with these fields:
- title (string): The actual recipe/dish name — infer from captions, hashtags, description, or any available clues. NEVER use generic names like "Instagram Recipe".
- description (string): Brief description of the dish — use context clues to describe what this dish is
- ingredients (array of {name, amount, unit}): All ingredients mentioned. If you can identify the dish but no specific ingredients are listed, provide the standard/common ingredients for that dish with "to taste" amounts.
- steps (array of strings): Ordered cooking steps — if you can identify the dish, provide reasonable standard steps for making it
- servings (number or null): Number of servings if mentioned
- prep_time_minutes (number or null): Prep time if mentioned, or estimate based on the dish
- cook_time_minutes (number or null): Cook time if mentioned, or estimate based on the dish
- tags (array of strings): Relevant tags like "vegan", "quick", "dessert" — infer from context, hashtags, and the dish type

IMPORTANT: Even if the content is very limited, use your knowledge to fill in reasonable details for the identified dish. A helpful guess is much better than empty fields. Do NOT refuse or explain — just output the JSON.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Clean up potential markdown code blocks
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // If Claude returned non-JSON (e.g. refusal text), return a minimal recipe
    console.error("Claude returned non-JSON:", cleaned.slice(0, 200));
    return {
      title: "Untitled Recipe",
      description: "",
      ingredients: [],
      steps: [],
      servings: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      tags: [],
    };
  }
}

export async function suggestMeals(
  pantryItems: PantryItem[],
  recipes: Recipe[]
): Promise<
  {
    recipeId: string;
    matchingIngredients: string[];
    missingIngredients: string[];
    substitutions: { original: string; substitute: string }[];
    reasoning: string;
  }[]
> {
  if (recipes.length === 0) return [];

  const pantryList = pantryItems.map((p) => p.name).join(", ");
  const recipeList = recipes
    .map(
      (r) =>
        `- "${r.title}" (ID: ${r.id}): needs ${(r.ingredients as Ingredient[]).map((i) => i.name).join(", ")}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: `You are a meal planning assistant. You ALWAYS respond with valid JSON only — no explanations, no apologies, no markdown. Even if the data is limited, you must return a JSON array. Never refuse. Never say "I cannot". Always produce JSON.`,
    messages: [
      {
        role: "user",
        content: `I have these ingredients in my pantry: ${pantryList}

Here are my saved recipes:
${recipeList}

Suggest up to 5 recipes I should cook, prioritizing recipes where I have the most ingredients. For each suggestion, provide:
- recipeId: the ID of the recipe
- matchingIngredients: ingredients I already have
- missingIngredients: ingredients I'd need to buy
- substitutions: any possible substitutions for missing ingredients using what I have (array of {original, substitute})
- reasoning: one sentence explaining why this is a good pick

IMPORTANT: Return ONLY a valid JSON array of these objects. No markdown, no code blocks, no extra text — just the JSON array.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for meal suggestions:", cleaned.slice(0, 200));
    return [];
  }
}
