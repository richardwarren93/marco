import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient, Recipe, PantryItem, MealPlanInsights } from "@/types";

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
- meal_type (string): REQUIRED — must be one of "breakfast", "lunch", "dinner", "snack". Infer from the dish itself. A pasta is "dinner". Oatmeal is "breakfast". A sandwich is "lunch". Nachos might be "snack" or "dinner". If it fits multiple, pick the most common one. Never leave this null or empty — always choose.

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
      meal_type: "dinner",
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
- meal_type (string): REQUIRED — must be one of "breakfast", "lunch", "dinner", "snack". Infer from the dish. Never leave this null or empty — always choose the most appropriate one.

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
      meal_type: "dinner",
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
  source_url?: string;
  image_url?: string;
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

For each recipe, include a sourceHint like "Popular on TikTok", "Instagram favorite", "Classic comfort food", "Trending recipe", or "Food creator staple".

IMPORTANT: When suggesting real, well-known recipes, include the source_url — the actual URL of the original recipe page (e.g. from allrecipes.com, budgetbytes.com, seriouseats.com, bonappetit.com, halfbakedharvest.com, etc.). Only include real URLs you are confident exist. If you are not sure of the exact URL, omit it.`;

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
- source_url: string or null — the real URL of the original recipe page if this is based on a well-known published recipe (e.g. from allrecipes.com, budgetbytes.com, seriouseats.com, bonappetit.com, halfbakedharvest.com, etc.). Only include URLs you are confident actually exist. Omit or set null if unsure.

Make recipes genuinely appetizing and varied. Think food creator quality — specific, flavorful, not generic. Prefer suggesting recipes that are based on real, popular published recipes with known source URLs.

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

// ─── Nutrition Estimation ──────────────────────────────────────────────────

export interface NutritionEstimate {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  confidence: "high" | "medium" | "low";
  notes: string;
}

export async function estimateNutrition(
  title: string,
  ingredients: Ingredient[],
  servings: number | null
): Promise<NutritionEstimate> {
  const ingredientList = ingredients
    .map((i) => `${i.amount || ""} ${i.unit || ""} ${i.name}`.trim())
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are a nutrition estimation assistant. You ALWAYS respond with valid JSON only — no explanations, no markdown. You estimate nutritional values per serving based on ingredients. Use standard USDA nutritional data as your reference. Be accurate but acknowledge uncertainty.`,
    messages: [
      {
        role: "user",
        content: `Estimate the nutritional value PER SERVING for this recipe.

Recipe: ${title}
Servings: ${servings || "1 (assume single serving)"}

Ingredients:
${ingredientList}

Return a JSON object with:
- calories (number): kcal per serving
- protein_g (number): grams of protein per serving
- carbs_g (number): grams of carbohydrates per serving
- fat_g (number): grams of fat per serving
- fiber_g (number): grams of fiber per serving
- sugar_g (number): grams of sugar per serving
- sodium_mg (number): milligrams of sodium per serving
- confidence (string): "high" if all ingredients have clear amounts, "medium" if some are vague like "to taste", "low" if many ingredients lack amounts or are very ambiguous
- notes (string): Brief 1-2 sentence note about key assumptions (e.g., "Assumed whole milk. Sodium estimate excludes added salt to taste.")

Return ONLY valid JSON. No markdown, no code blocks.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for nutrition:", cleaned.slice(0, 200));
    return {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
      confidence: "low",
      notes: "Unable to estimate nutrition for this recipe.",
    };
  }
}

// ─── Meal Plan Analysis ────────────────────────────────────────────────────

export interface MealPlanDayData {
  date: string;
  dayName: string;
  meals: Array<{
    mealType: string;
    recipeName: string;
    servings: number;
    nutrition: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      fiber_g: number;
    } | null;
    tags: string[];
  }>;
}

export async function analyzeMealPlan(weekData: {
  weekStart: string;
  days: MealPlanDayData[];
  totalMeals: number;
  dailyAverages: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
}): Promise<MealPlanInsights> {
  const daysSummary = weekData.days
    .map((d) => {
      const meals = d.meals
        .map((m) => {
          const nutri = m.nutrition
            ? `(${m.nutrition.calories} cal, ${m.nutrition.protein_g}g protein, ${m.nutrition.carbs_g}g carbs, ${m.nutrition.fat_g}g fat)`
            : "(nutrition unknown)";
          return `  - ${m.mealType}: ${m.recipeName} x${m.servings} ${nutri} [tags: ${m.tags.join(", ") || "none"}]`;
        })
        .join("\n");
      return `${d.dayName} (${d.date}):\n${meals || "  No meals planned"}`;
    })
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are a friendly nutritionist and meal planning advisor for the Marco cooking app. You ALWAYS respond with valid JSON only — no explanations, no markdown.

Your tone is encouraging first, constructive second — never preachy or judgmental. This is a home cook, not a bodybuilder. Keep recommendations practical and specific.

Reference ranges (for context, not strict rules):
- Calories: ~1800-2200/day for most adults
- Protein: ~50-70g/day
- Fiber: ~25-30g/day
- Fat: ~50-80g/day
- Carbs: ~200-300g/day`,
    messages: [
      {
        role: "user",
        content: `Analyze this week's meal plan and provide nutritional insights.

Week starting: ${weekData.weekStart}
Total meals planned: ${weekData.totalMeals}
Daily averages: ${weekData.dailyAverages.calories} cal, ${weekData.dailyAverages.protein_g}g protein, ${weekData.dailyAverages.carbs_g}g carbs, ${weekData.dailyAverages.fat_g}g fat, ${weekData.dailyAverages.fiber_g}g fiber

Day-by-day breakdown:
${daysSummary}

Return a JSON object with:
- overallScore (number 1-100): Overall quality score for the week
- scoreLabel (string): "Great week!", "Looking good", "Room to grow", or "Needs attention"
- headline (string): One personalized sentence summarizing the week (be encouraging!)
- nutritionAnalysis (object):
  - dailyCalorieAvg (number)
  - calorieAssessment (string): "On track", "A bit low", "A bit high", or "Well balanced"
  - macroBalance (string): One sentence about the macro split
  - fiberAssessment (string): One sentence about fiber intake
  - proteinAdequacy (string): One sentence about protein intake
- balanceInsights (array of 3-5 objects):
  - icon (string): A single emoji
  - title (string): Short insight title
  - detail (string): 1-2 sentence explanation
  - severity (string): "positive", "suggestion", or "warning"
- recommendations (array of exactly 3 objects):
  - emoji (string): A single emoji
  - text (string): Specific, actionable recommendation (e.g., "Add a spinach salad to Wednesday's dinner" not "Eat more vegetables")
- varietyScore (number 1-10): How varied the meals are
- varietyNote (string): One sentence about variety

Return ONLY valid JSON. No markdown, no code blocks.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Claude returned non-JSON for meal plan analysis:", cleaned.slice(0, 200));
    return {
      overallScore: 50,
      scoreLabel: "Needs attention",
      headline: "We couldn't fully analyze your meal plan this time.",
      nutritionAnalysis: {
        dailyCalorieAvg: weekData.dailyAverages.calories,
        calorieAssessment: "Unknown",
        macroBalance: "Unable to assess macro balance.",
        fiberAssessment: "Unable to assess fiber intake.",
        proteinAdequacy: "Unable to assess protein intake.",
      },
      balanceInsights: [],
      recommendations: [
        { emoji: "📝", text: "Try adding more meals to your plan for a better analysis." },
        { emoji: "🥗", text: "Include a mix of proteins, grains, and vegetables." },
        { emoji: "🔄", text: "Vary your recipes throughout the week." },
      ],
      varietyScore: 5,
      varietyNote: "Add more meals for a variety assessment.",
    };
  }
}
