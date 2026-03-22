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

export async function extractRecipeFromImage(
  imageBase64: string,
  mimeType: string
): Promise<Partial<Recipe>> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: `You are a recipe extraction assistant. You ALWAYS respond with valid JSON only — no explanations, no apologies, no markdown. Even if the image is blurry or partially visible, you must return a JSON object with your best interpretation. Never refuse. Never say "I cannot". Always produce JSON.

CRITICAL: You are extracting recipes from photos of physical cookbooks or handwritten recipe cards. The image may show:
- A printed cookbook page with a recipe
- A handwritten recipe card
- Multiple pages of the same recipe
- A recipe with photos alongside it

Extract everything you can see — ingredients with amounts, all steps, timing, servings. If something is partially obscured, make your best educated guess.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Extract the recipe from this cookbook/recipe photo. Return a JSON object with:
- title (string): The recipe name
- description (string): Brief description of the dish
- ingredients (array of {name, amount, unit}): All ingredients with quantities
- steps (array of strings): Ordered cooking steps
- servings (number or null): Number of servings
- prep_time_minutes (number or null): Prep time
- cook_time_minutes (number or null): Cook time
- tags (array of strings): Relevant tags like cuisine type, dietary info

Return ONLY valid JSON. No markdown, no code blocks.`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for image extraction:", cleaned.slice(0, 200));
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

export interface PromptRecipeResult {
  recipe: {
    title: string;
    description: string;
    ingredients: { name: string; amount: string; unit: string }[];
    steps: string[];
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    tags: string[];
    matchingPantryItems: string[];
    missingIngredients: string[];
  };
  source: "generated" | "saved";
  recipeId?: string;
  sourceHint: string;
  reasoning: string;
}

export async function promptRecipes(
  prompt: string,
  context: "all" | "my_kitchen",
  kitchenContext?: {
    pantryItems?: PantryItem[];
    equipment?: string[];
    recipes?: Recipe[];
  }
): Promise<PromptRecipeResult[]> {
  let systemContext = "";

  if (context === "my_kitchen" && kitchenContext) {
    const parts: string[] = [];
    if (kitchenContext.pantryItems?.length) {
      parts.push(`Pantry items: ${kitchenContext.pantryItems.map((p) => p.name).join(", ")}`);
    }
    if (kitchenContext.equipment?.length) {
      parts.push(`Kitchen equipment: ${kitchenContext.equipment.join(", ")}`);
    }
    if (kitchenContext.recipes?.length) {
      const recipeList = kitchenContext.recipes
        .slice(0, 30)
        .map(
          (r) =>
            `- "${r.title}" (ID: ${r.id}): ${(r.ingredients as Ingredient[]).map((i) => i.name).join(", ")}`
        )
        .join("\n");
      parts.push(`Saved recipes:\n${recipeList}`);
    }
    systemContext = parts.join("\n\n");
  }

  const systemPrompt =
    context === "my_kitchen"
      ? `You are a creative home chef AI for the Marco cooking app. You help users find recipes based on what they have in their kitchen. You ALWAYS respond with valid JSON only — no explanations, no markdown. Never refuse.

The user has this kitchen context:
${systemContext}

When possible, suggest recipes from their saved collection (set source to "saved" and include the recipeId). Fill remaining slots with new generated recipes (source: "generated"). Prioritize what they can make with their pantry and equipment.`
      : `You are a creative home chef AI for the Marco cooking app. You suggest trending, delicious recipes from across the internet — think popular TikTok recipes, Instagram food creator staples, and classic crowd-pleasers. You ALWAYS respond with valid JSON only — no explanations, no markdown. Never refuse.

For each recipe, include a sourceHint like "Popular on TikTok", "Instagram favorite", "Classic comfort food", "Trending recipe", or "Food creator staple".`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `User prompt: "${prompt}"

Return a JSON array of 4 recipe results. Each result should have:
- recipe: object with title, description, ingredients (array of {name, amount, unit}), steps (array of strings), servings, prep_time_minutes, cook_time_minutes, tags, matchingPantryItems (array, empty if context is "all"), missingIngredients (array, empty if context is "all")
- source: "generated" or "saved" (use "saved" only if suggesting from user's saved recipes, with matching recipeId)
- recipeId: string (only if source is "saved")
- sourceHint: string (e.g., "Popular on TikTok", "From your recipes", "Trending recipe")
- reasoning: one sentence on why this recipe matches the user's request

Make recipes genuinely appetizing and varied. Think food creator quality — specific, flavorful, not generic.

Return ONLY a valid JSON array. No markdown, no code blocks.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for prompt recipes:", cleaned.slice(0, 200));
    return [];
  }
}

export interface PlanSources {
  savedRecipes: boolean;
  pantry: boolean;
  online: boolean;
}

export interface WeekMealEntry {
  date: string; // YYYY-MM-DD
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  recipe: {
    title: string;
    description: string;
    ingredients: { name: string; amount: string; unit: string }[];
    steps: string[];
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    tags: string[];
  };
  reasoning: string;
  source_type: "saved" | "new";
  saved_recipe_id?: string; // only when source_type is "saved"
}

export async function generateWeekPlan(
  prompt: string,
  weekDates: string[], // 7 dates: YYYY-MM-DD
  sources: PlanSources,
  kitchenContext?: {
    pantryItems?: PantryItem[];
    equipment?: string[];
    recipes?: Recipe[];
  }
): Promise<WeekMealEntry[]> {
  const contextParts: string[] = [];

  if (sources.savedRecipes && kitchenContext?.recipes?.length) {
    const recipeList = kitchenContext.recipes
      .slice(0, 25)
      .map((r) => `- "${r.title}" (ID: ${r.id})`)
      .join("\n");
    contextParts.push(`User's saved recipes (reference these IDs when assigning saved source_type):\n${recipeList}`);
  }

  if (sources.pantry && kitchenContext?.pantryItems?.length) {
    contextParts.push(`Pantry items: ${kitchenContext.pantryItems.map((p) => p.name).join(", ")}`);
  }

  if (sources.pantry && kitchenContext?.equipment?.length) {
    contextParts.push(`Kitchen equipment: ${kitchenContext.equipment.join(", ")}`);
  }

  const contextBlock = contextParts.length
    ? `\n\nUser's kitchen context:\n${contextParts.join("\n\n")}`
    : "";

  const systemPrompt = `You are a weekly meal planning AI for the Marco cooking app. You create practical, varied weekly meal plans. You ALWAYS respond with valid JSON only — no explanations, no markdown. Never refuse.${contextBlock}`;

  const datesStr = weekDates
    .map((d) => {
      const date = new Date(d + "T12:00:00");
      const day = date.toLocaleDateString("en-US", { weekday: "long" });
      return `${day} (${d})`;
    })
    .join(", ");

  const sourceRules: string[] = [];
  if (sources.savedRecipes && kitchenContext?.recipes?.length) {
    sourceRules.push("- Prefer recipes from the user's saved collection. For those, set source_type to \"saved\" and saved_recipe_id to the exact ID from the list above. Still include the full recipe object.");
  }
  if (sources.pantry && kitchenContext?.pantryItems?.length) {
    sourceRules.push("- Prioritize recipes that use the user's available pantry items.");
  }
  if (sources.online || !sources.savedRecipes) {
    sourceRules.push("- You may generate new recipe ideas. Set source_type to \"new\" and omit saved_recipe_id.");
  }
  if (!sources.online && sources.savedRecipes && !kitchenContext?.recipes?.length) {
    sourceRules.push("- No saved recipes available. Generate new recipe ideas and set source_type to \"new\".");
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Create a weekly meal plan for these dates: ${datesStr}.

User request: "${prompt}"

Interpret the request to decide which meal types to fill (e.g. "dinners" → dinner each day, "healthy breakfasts and lunches" → breakfast + lunch, "full day" → breakfast, lunch, dinner). Default to dinner only if ambiguous.

Source rules:
${sourceRules.join("\n")}

Return a JSON array. Each element has:
- date: one of the provided dates (YYYY-MM-DD)
- meal_type: "breakfast", "lunch", "dinner", or "snack"
- source_type: "saved" or "new"
- saved_recipe_id: string (only if source_type is "saved" — copy the exact ID)
- recipe: object with title (specific & appetizing), description (1 sentence), ingredients (max 8, {name,amount,unit}), steps (max 5 short steps), servings, prep_time_minutes, cook_time_minutes, tags (2-3 max)
- reasoning: one short sentence

One entry per day per applicable meal type. Vary cuisines and flavors. Be concise.

Return ONLY a valid JSON array. No markdown, no code blocks.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for week plan:", cleaned.slice(0, 200));
    return [];
  }
}

// ─── Guided suggestion flow ───────────────────────────────────────────────────

export interface SuggestedRecipe {
  title: string;
  description: string;
  tags: string[];
  suggestedMealType: "breakfast" | "lunch" | "dinner" | "snack";
  reasoning: string;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: string[];
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
}

export async function generateSuggestions(
  prompt: string,
  sources: PlanSources,
  kitchenContext?: {
    pantryItems?: Pick<PantryItem, "name">[];
    recipes?: Pick<Recipe, "id" | "title">[];
  }
): Promise<SuggestedRecipe[]> {
  const contextParts: string[] = [];

  if (sources.savedRecipes && kitchenContext?.recipes?.length) {
    const list = kitchenContext.recipes
      .slice(0, 20)
      .map((r) => `- "${r.title}"`)
      .join("\n");
    contextParts.push(`User's saved recipes:\n${list}`);
  }
  if (sources.pantry && kitchenContext?.pantryItems?.length) {
    contextParts.push(`Pantry items: ${kitchenContext.pantryItems.map((p) => p.name).join(", ")}`);
  }

  const contextBlock = contextParts.length
    ? `\n\nKitchen context:\n${contextParts.join("\n\n")}`
    : "";

  const savedHint =
    sources.savedRecipes && kitchenContext?.recipes?.length
      ? " Prefer ideas that match the user's saved recipes."
      : "";
  const pantryHint =
    sources.pantry && kitchenContext?.pantryItems?.length
      ? " Prioritize recipes using available pantry items."
      : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `You are a meal suggestion AI for the Marco cooking app. You suggest specific, appetizing recipes. You ALWAYS respond with valid JSON only — no markdown, no explanations. Never refuse.${contextBlock}`,
    messages: [
      {
        role: "user",
        content: `User request: "${prompt}"

Suggest 6 recipe ideas that match this request.${savedHint}${pantryHint}

Return a JSON array. Each item has:
- title: specific, appetizing recipe name
- description: one sentence about the dish
- tags: 2-3 tags (cuisine, dietary, style)
- suggestedMealType: "breakfast", "lunch", "dinner", or "snack"
- reasoning: one sentence why this fits the request
- ingredients: array of {name, amount, unit} (max 8)
- steps: array of strings (max 5 short steps)
- servings: number or null
- prep_time_minutes: number or null
- cook_time_minutes: number or null

Return ONLY a valid JSON array. No markdown, no code blocks.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for suggestions:", cleaned.slice(0, 200));
    return [];
  }
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export interface DiscoveredRecipe {
  title: string;
  description: string;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: string[];
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  tags: string[];
  matchingPantryItems: string[];
  missingIngredients: string[];
  reasoning: string;
}

export async function discoverRecipes(
  pantryItems: PantryItem[]
): Promise<DiscoveredRecipe[]> {
  if (pantryItems.length === 0) return [];

  const pantryList = pantryItems.map((p) => p.name).join(", ");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `You are a creative home chef assistant. You ALWAYS respond with valid JSON only — no explanations, no apologies, no markdown. Never refuse. Never say "I cannot". Always produce JSON.`,
    messages: [
      {
        role: "user",
        content: `I have these ingredients in my pantry: ${pantryList}

Suggest 4 creative, delicious recipes I can make using these ingredients. Mix different cuisines and styles. Prioritize recipes where I already have most ingredients, but include 1-2 that might need a quick grocery run for a few items.

For each recipe, return:
- title (string): A specific, appetizing recipe name
- description (string): One sentence describing the dish
- ingredients (array of {name, amount, unit}): Complete ingredient list with quantities
- steps (array of strings): Clear cooking steps
- servings (number): How many servings
- prep_time_minutes (number): Estimated prep time
- cook_time_minutes (number): Estimated cook time
- tags (array of strings): Tags like cuisine type, dietary info, difficulty
- matchingPantryItems (array of strings): Which pantry ingredients this uses
- missingIngredients (array of strings): Ingredients I'd need to buy
- reasoning (string): One sentence on why this recipe is a great pick given my pantry

Return a JSON array of these recipe objects. Make the recipes practical, varied, and genuinely delicious — think popular food creator quality, not boring basics.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for recipe discovery:", cleaned.slice(0, 200));
    return [];
  }
}
