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

CRITICAL: Social media recipe posts (especially Instagram Reels, TikTok, and YouTube videos/Shorts) often have very limited scrapeable text. When the content is minimal:
- Use hashtags, captions, author names, video titles, transcripts, and any clues to identify the dish
- If you can identify the dish name, provide a reasonable set of common ingredients and basic cooking steps for that dish
- Extract any mentioned ingredients or techniques, even from hashtags (e.g. #chickenpasta → chicken, pasta)
- For YouTube content, the "Title" field at the top of the scraped content is the video title — use it as the primary signal for the dish name. The "Transcript" field captures spoken ingredients and steps verbatim and should drive the recipe contents.
- Make your best educated guess about what the recipe is — a reasonable guess is far more useful than empty fields
- NEVER return generic titles like "Instagram Recipe", "TikTok Recipe", "YouTube Recipe", or "Social Media Recipe" — always try to identify the actual dish`,
    messages: [
      {
        role: "user",
        content: `Extract a recipe from this social media post content. The content may be limited since it was scraped from a video-based social media post.

Source URL: ${sourceUrl}

Scraped Content:
${scrapedContent}

Return a JSON object with these fields:
- title (string): The actual recipe/dish name — infer from the video title, captions, hashtags, transcript, description, or any available clues. NEVER use generic names like "Instagram Recipe", "TikTok Recipe", or "YouTube Recipe".
- description (string): Brief description of the dish — use context clues to describe what this dish is
- ingredients (array of {name, amount, unit}): All ingredients mentioned. If you can identify the dish but no specific ingredients are listed, provide the standard/common ingredients for that dish with "to taste" amounts.
- steps (array of strings): Ordered cooking steps — if you can identify the dish, provide reasonable standard steps for making it
- servings (number or null): Number of servings if mentioned
- prep_time_minutes (number or null): Prep time if mentioned, or estimate based on the dish
- cook_time_minutes (number or null): Cook time if mentioned, or estimate based on the dish
- tags (array of strings): Relevant tags like "vegan", "quick", "dessert" — infer from context, hashtags, and the dish type
- meal_type (string): REQUIRED — must be one of "breakfast", "lunch", "dinner", "snack". Infer from the dish itself. A pasta is "dinner". Oatmeal is "breakfast". A sandwich is "lunch". Nachos might be "snack" or "dinner". If it fits multiple, pick the most common one. Never leave this null or empty — always choose.
- calories (number): Estimated calories per serving based on the ingredients
- protein_g (number): Estimated grams of protein per serving
- carbs_g (number): Estimated grams of carbohydrates per serving
- fat_g (number): Estimated grams of fat per serving
- fiber_g (number): Estimated grams of fiber per serving

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

export async function extractRecipeFromCarousel(
  imageUrls: string[],
  caption: string
): Promise<Partial<Recipe>> {
  // Download all carousel images in parallel (with timeout)
  const imageBlocks: Array<{
    type: "image";
    source: {
      type: "base64";
      media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      data: string;
    };
  }> = [];

  const downloads = await Promise.allSettled(
    imageUrls.slice(0, 10).map(async (url) => {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) return null;
      const buffer = Buffer.from(await resp.arrayBuffer());
      const contentType = resp.headers.get("content-type") || "image/jpeg";
      const mediaType = contentType.split(";")[0].trim() as
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "image/gif";
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType,
          data: buffer.toString("base64"),
        },
      };
    })
  );

  for (const result of downloads) {
    if (result.status === "fulfilled" && result.value) {
      imageBlocks.push(result.value);
    }
  }

  if (imageBlocks.length === 0) {
    // Couldn't download any images — fall back to text-only extraction
    return extractRecipe(caption, "tiktok carousel");
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: `You are a recipe extraction assistant. You ALWAYS respond with valid JSON only — no explanations, no apologies, no markdown. Never refuse. Always produce JSON.

You are extracting a recipe from a TikTok photo carousel. The slides may contain:
- A beautiful food photo (usually the first slide)
- Ingredient lists (often handwritten or as text overlays)
- Step-by-step cooking instructions
- Tips or notes about the recipe

The caption from the post is also provided for additional context. Combine information from ALL slides and the caption to produce a complete recipe.`,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `These are ${imageBlocks.length} slides from a TikTok recipe carousel. The post caption is:
"${caption}"

Extract the complete recipe from these carousel slides. Return a JSON object with:
- title (string): The recipe name from the post
- description (string): Brief description of the dish
- ingredients (array of {name, amount, unit}): All ingredients with quantities — look carefully at each slide for ingredient lists
- steps (array of strings): Ordered cooking steps — look for step-by-step slides
- servings (number or null): Number of servings if mentioned
- prep_time_minutes (number or null): Prep time if mentioned or estimate
- cook_time_minutes (number or null): Cook time if mentioned or estimate
- tags (array of strings): Relevant tags from hashtags, cuisine type, dietary info
- meal_type (string): REQUIRED — must be one of "breakfast", "lunch", "dinner", "snack"
- calories (number): Estimated calories per serving based on the ingredients
- protein_g (number): Estimated grams of protein per serving
- carbs_g (number): Estimated grams of carbohydrates per serving
- fat_g (number): Estimated grams of fat per serving
- fiber_g (number): Estimated grams of fiber per serving

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
    console.error(
      "Claude returned non-JSON for carousel extraction:",
      cleaned.slice(0, 200)
    );
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
- calories (number): Estimated calories per serving based on the ingredients
- protein_g (number): Estimated grams of protein per serving
- carbs_g (number): Estimated grams of carbohydrates per serving
- fat_g (number): Estimated grams of fat per serving
- fiber_g (number): Estimated grams of fiber per serving

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
  },
  tasteProfile?: {
    sweet: number;
    savory: number;
    spicy: number;
    tangy: number;
    richness: number;
    topCuisines?: string[];
    cookingStyles?: string[];
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

  // Build taste profile context string
  let tasteContext = "";
  if (tasteProfile) {
    const parts: string[] = [];
    parts.push(`User's taste profile (use ONLY as a tiebreaker between equally-good matches for the search query — NEVER override or substitute the search query itself): Sweet ${tasteProfile.sweet}/100, Savory ${tasteProfile.savory}/100, Spicy ${tasteProfile.spicy}/100, Tangy ${tasteProfile.tangy}/100, Richness ${tasteProfile.richness}/100.`);
    if (tasteProfile.topCuisines?.length) parts.push(`Top cuisines (tiebreaker only — if user searched a specific dish, return that dish): ${tasteProfile.topCuisines.join(", ")}.`);
    if (tasteProfile.cookingStyles?.length) parts.push(`Preferred cooking styles (tiebreaker only): ${tasteProfile.cookingStyles.join(", ")}.`);
    parts.push("EXAMPLE: If user searches 'lamb chops' and prefers Italian food, return 6 different LAMB CHOP recipes (perhaps slightly favoring a Mediterranean style as one of them). Do NOT return Italian pasta dishes just because they like Italian food.");
    tasteContext = "\n\n" + parts.join(" ");
  }

  const systemPrompt =
    context === "my_kitchen"
      ? `You are a creative home chef AI for the Salt & Spoon cooking app. You help users find recipes based on what they have in their kitchen. You ALWAYS respond with valid JSON only — no explanations, no markdown. Never refuse.

The user has this kitchen context:
${systemContext}

When possible, suggest recipes from their saved collection (set source to "saved" and include the recipeId). Fill remaining slots with new generated recipes (source: "generated"). Prioritize what they can make with their pantry and equipment.${tasteContext}`
      : `You are a creative home chef AI for the Salt & Spoon cooking app. You suggest trending, delicious recipes from across the internet — think popular TikTok recipes, Instagram food creator staples, and classic crowd-pleasers. You ALWAYS respond with valid JSON only — no explanations, no markdown. Never refuse.

For each recipe, include a sourceHint like "Popular on TikTok", "Instagram favorite", "Classic comfort food", "Trending recipe", or "Food creator staple".

IMPORTANT: When suggesting real, well-known recipes, include the source_url — the actual URL of the original recipe page (e.g. from allrecipes.com, budgetbytes.com, seriouseats.com, bonappetit.com, halfbakedharvest.com, etc.). Only include real URLs you are confident exist. If you are not sure of the exact URL, omit it.${tasteContext}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3500,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `User prompt: "${prompt}"

PRIMARY DIRECTIVE: Match the user's search query first. The query is the dish/ingredient they want. Return 6 different variations or interpretations of THAT specific query.

Return a JSON array of 6 recipe results. Each result should have:
- recipe: object with title, description, ingredients (array of {name, amount, unit}), steps (array of strings), servings, prep_time_minutes, cook_time_minutes, tags, matchingPantryItems (array, empty if context is "all"), missingIngredients (array, empty if context is "all")
- source: "generated" or "saved" (use "saved" only if suggesting from user's saved recipes, with matching recipeId)
- recipeId: string (only if source is "saved")
- sourceHint: string (e.g., "Popular on TikTok", "From your recipes", "Trending recipe")
- reasoning: one sentence on why this recipe matches the user's request
- source_url: string or null — the real URL of the original recipe page if this is based on a well-known published recipe (e.g. from allrecipes.com, budgetbytes.com, seriouseats.com, bonappetit.com, halfbakedharvest.com, etc.). Only include URLs you are confident actually exist. Omit or set null if unsure.

Make recipes genuinely appetizing and varied — different cooking methods, cuisines, or styles, but ALL matching the user's search query. STRONGLY prefer suggesting recipes that are based on real, popular published recipes with known source URLs (so we can pull cover images). At least 4 of the 6 should have a real source_url.

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
    // Claude occasionally wraps JSON in prose ("Here are 6 recipes: [...]").
    // Salvage the first JSON array we can find before giving up.
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through to error log
      }
    }
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

// ─── Document Batch Extraction ────────────────────────────────────────────

export async function extractRecipesFromDocument(
  text: string
): Promise<Partial<Recipe>[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: `You are a recipe extraction assistant. You ALWAYS respond with valid JSON only — no explanations, no apologies, no markdown. Never refuse. Never say "I cannot". Always produce JSON.

You are extracting recipes from a document that may contain multiple recipes. The document could be:
- A cookbook or recipe collection (PDF or Word doc)
- A ChatGPT conversation export with recipes
- A plain text file with recipes
- A meal prep list or blog post with multiple recipes

Your job is to identify ALL distinct recipes in the document and extract each one fully. Ignore non-recipe content like table of contents, introductions, conversational text, or notes that aren't part of a recipe.`,
    messages: [
      {
        role: "user",
        content: `Extract ALL recipes from this document. Return a JSON array where each element is a recipe object.

Document text:
${text.slice(0, 100000)}

For each recipe, return an object with:
- title (string): The recipe name
- description (string): Brief description of the dish
- ingredients (array of {name, amount, unit}): All ingredients with quantities
- steps (array of strings): Ordered cooking steps
- servings (number or null): Number of servings
- prep_time_minutes (number or null): Prep time
- cook_time_minutes (number or null): Cook time
- tags (array of strings): Relevant tags like cuisine type, dietary info, "dessert", etc.
- meal_type (string): REQUIRED — must be one of "breakfast", "lunch", "dinner", "snack". Infer from the dish. Never leave this null or empty.
- calories (number): Estimated calories per serving based on the ingredients
- protein_g (number): Estimated grams of protein per serving
- carbs_g (number): Estimated grams of carbohydrates per serving
- fat_g (number): Estimated grams of fat per serving
- fiber_g (number): Estimated grams of fiber per serving

If the document contains only one recipe, return an array with one element.
If you find no recipes, return an empty array [].

Return ONLY a valid JSON array. No markdown, no code blocks.`,
      },
    ],
  });

  const respText =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = respText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    console.error(
      "Claude returned non-JSON for document extraction:",
      cleaned.slice(0, 200)
    );
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



// ─── Ingredient substitutions ─────────────────────────────────────────────

export interface SubstitutionOption {
  name: string;
  amount: string;
  unit: string;
  ratioNote?: string;
  reasoning: string;
  quality: "best" | "good" | "ok";
}

export interface SubstitutionResult {
  /** What role the original ingredient plays in this recipe (best-effort tag). */
  role: string;
  options: SubstitutionOption[];
}

/**
 * Ask Claude for 2–3 ranked substitutes for a single ingredient inside a
 * specific recipe. The grounding (recipe title + full ingredient list +
 * brief step context) is what makes this differentiated from a generic
 * Google search — the same swap question gets a different answer depending
 * on what the ingredient is doing here.
 */
export async function suggestSubstitutions(
  recipe: { title: string; ingredients: Ingredient[]; steps: string[] },
  target: { name: string; amount: string; unit: string },
): Promise<SubstitutionResult> {
  const otherIngredients = recipe.ingredients
    .filter((i) => i.name !== target.name)
    .map((i) => `- ${i.amount}${i.unit ? " " + i.unit : ""} ${i.name}`)
    .join("\n");

  const stepSummary = recipe.steps.slice(0, 6).map((s, idx) => `${idx + 1}. ${s}`).join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system: `You are a cooking assistant suggesting ingredient substitutions. You ALWAYS respond with valid JSON only — no explanations, no markdown.

Your goal is role-aware substitution: identify what role the target ingredient is playing in THIS recipe (acid, fat, binder, aromatic, leavener, structure, sweetener, liquid, or similar) and rank substitutes by how well they preserve that role HERE. Greek yogurt for sour cream is great as a topping but problematic in baking — your ranking should reflect that distinction.

Tone: encouraging and specific. "Rest 5 min" is better than "let it sit". One-line reasoning like "preserves both acid and tenderizing" beats vague "good substitute".`,
    messages: [
      {
        role: "user",
        content: `Recipe: ${recipe.title}

Other ingredients:
${otherIngredients || "(none)"}

First few steps:
${stepSummary || "(none)"}

Substitute for: ${target.amount}${target.unit ? " " + target.unit : ""} ${target.name}

Return JSON:
{
  "role": "string — single short tag for what role this ingredient plays here, e.g. \\"acid + leavener tenderizer\\", \\"binder\\", \\"aromatic\\"",
  "options": [
    {
      "name": "substitute ingredient",
      "amount": "amount as a string (e.g. \\"230\\", \\"1\\", \\"3/4\\")",
      "unit": "unit (e.g. \\"ml\\", \\"cup\\", \\"tbsp\\") or empty string if implied",
      "ratioNote": "optional short hint like \\"rest 5 min\\" or empty",
      "reasoning": "one short sentence — why this works HERE, grounded in the role",
      "quality": "best" | "good" | "ok"
    }
  ]
}

Provide 2–3 options total, ranked from best to ok. Only ONE option may be \\"best\\". Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as SubstitutionResult;
    return parsed;
  } catch {
    console.error("Claude returned non-JSON for substitutions:", cleaned.slice(0, 200));
    return { role: "ingredient", options: [] };
  }
}
