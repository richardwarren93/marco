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
    messages: [
      {
        role: "user",
        content: `Extract a recipe from this social media post content.

The content was scraped from: ${sourceUrl}

Content:
${scrapedContent}

Return a JSON object with these fields:
- title (string): Recipe name
- description (string): Brief description
- ingredients (array of {name, amount, unit}): All ingredients with quantities
- steps (array of strings): Ordered cooking steps
- servings (number or null): Number of servings
- prep_time_minutes (number or null): Prep time
- cook_time_minutes (number or null): Cook time
- tags (array of strings): Relevant tags like "vegan", "quick", "dessert"

If the content doesn't contain a clear recipe, do your best to infer from the available information. If ingredients have no quantities, use "to taste" or leave amount empty.

Return ONLY valid JSON, no markdown code blocks or extra text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Clean up potential markdown code blocks
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
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

Return a JSON array of these objects. Return ONLY valid JSON, no markdown code blocks or extra text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}
