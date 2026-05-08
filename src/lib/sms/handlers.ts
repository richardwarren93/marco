import Anthropic from "@anthropic-ai/sdk";
import { scrapeUrl, detectPlatform } from "@/lib/scraper";
import { extractRecipe, extractRecipeFromCarousel } from "@/lib/claude";
import { rehostImage, isExpiringCdn, rehostIfExpiring } from "@/lib/image-rehost";
import { findExistingRecipeByFingerprint } from "@/lib/recipes/dedup";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Recipe } from "@/types";

const anthropic = new Anthropic();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://marco-eta-lyart.vercel.app";

function recipeLink(recipeId: string): string {
  return `${APP_URL}/recipes/${recipeId}`;
}

// SMS bodies — keep concise. Twilio US standard SMS is 160 chars per segment;
// going over splits into multiple billed segments. Aim for ≤320 chars.
function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export async function handleSaveRecipe(userId: string, url: string): Promise<string> {
  const admin = createAdminClient();
  try {
    const { content, image_url: scrapedImage, image_urls } = await scrapeUrl(url);
    const [recipe, image_url] = await Promise.all([
      image_urls?.length
        ? extractRecipeFromCarousel(image_urls, content)
        : extractRecipe(content, url),
      rehostImage(scrapedImage),
    ]);

    const existing = await findExistingRecipeByFingerprint(admin, userId, {
      title: recipe.title || "Untitled recipe",
      source_url: url,
      image_url,
    });
    if (existing) {
      return `Already saved: "${truncate(existing.title, 60)}"\n${recipeLink(existing.id)}`;
    }

    const originalImageUrl = image_url || null;
    const needsRehost = isExpiringCdn(originalImageUrl);

    const { data, error } = await admin
      .from("recipes")
      .insert({
        user_id: userId,
        title: recipe.title,
        description: recipe.description || null,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        servings: recipe.servings || null,
        prep_time_minutes: recipe.prep_time_minutes || null,
        cook_time_minutes: recipe.cook_time_minutes || null,
        tags: recipe.tags || [],
        meal_type: recipe.meal_type || "dinner",
        source_url: url,
        source_platform: detectPlatform(url),
        image_url: originalImageUrl,
        calories: recipe.calories ?? null,
        protein_g: recipe.protein_g ?? null,
        carbs_g: recipe.carbs_g ?? null,
        fat_g: recipe.fat_g ?? null,
        fiber_g: recipe.fiber_g ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Activity feed entry (non-critical)
    admin.from("activity_feed").insert({
      user_id: userId,
      activity_type: "saved_recipe",
      recipe_id: data.id,
    }).then(() => {}, () => {});

    // Background image rehost
    if (needsRehost) {
      rehostIfExpiring(originalImageUrl).then(async (persistent) => {
        if (persistent && persistent !== originalImageUrl) {
          await admin.from("recipes").update({ image_url: persistent }).eq("id", data.id);
        }
      }).catch(() => {});
    }

    return `Saved "${truncate(recipe.title || "recipe", 50)}" to Marco.\n${recipeLink(data.id)}`;
  } catch (err) {
    console.error("[sms] save error:", err);
    return "Couldn't save that recipe. The link may be private or unsupported. Try sharing the public URL.";
  }
}

export async function handleFindRecipe(userId: string, query: string): Promise<string> {
  const admin = createAdminClient();
  const { data: recipes } = await admin
    .from("recipes")
    .select("id, title, meal_type, tags, description")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!recipes?.length) {
    return `You haven't saved any recipes yet. Send me a recipe URL to save your first one.`;
  }

  const list = (recipes as Pick<Recipe, "id" | "title" | "meal_type" | "tags" | "description">[])
    .map(
      (r) =>
        `ID:${r.id} | "${r.title}" | ${r.meal_type || "dinner"} | tags: ${(r.tags || []).join(", ")} | ${r.description || ""}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Here are the user's saved recipes:\n${list}\n\nQuery: "${query}"\n\nReturn ONLY a JSON array of up to 3 matching recipe IDs. Empty array if nothing matches well. No markdown.`,
      },
    ],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let ids: string[] = [];
  try {
    ids = JSON.parse(cleaned);
  } catch {
    ids = [];
  }
  const matched = (recipes as Pick<Recipe, "id" | "title">[]).filter((r) => ids.includes(r.id));

  if (!matched.length) {
    return `Couldn't find a saved recipe matching "${truncate(query, 40)}". Try a different search.`;
  }
  if (matched.length === 1) {
    return `${matched[0].title}\n${recipeLink(matched[0].id)}`;
  }
  return matched
    .slice(0, 3)
    .map((r, i) => `${i + 1}. ${truncate(r.title, 50)}\n${recipeLink(r.id)}`)
    .join("\n\n");
}

export async function handleChat(userId: string, message: string): Promise<string> {
  const admin = createAdminClient();
  // Fetch lightweight context (allergies, household size) like the on-app chat.
  const { data: prefs } = await admin
    .from("user_preferences")
    .select("allergies, household_size, taste_profile")
    .eq("user_id", userId)
    .maybeSingle();

  const allergies = (prefs?.allergies as string[] | undefined)?.join(", ") || "none";
  const household = prefs?.household_size || "unknown";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: `You are Marco, a friendly cooking assistant replying via SMS. Keep replies SHORT — under 300 characters when possible. No markdown, no bullet lists with bold, no emojis unless natural. Plain text only. The user's allergies: ${allergies}. Household size: ${household}.`,
    messages: [{ role: "user", content: message }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return truncate(text.trim(), 600);
}

export function helpReply(): string {
  return [
    "Hey! I'm Marco. Text me to:",
    "• Save a recipe — paste any recipe link",
    "• Find a recipe — \"send me my chicken pad thai\"",
    "• Ask cooking questions — \"how long do I roast salmon?\"",
    "Reply STOP to opt out.",
  ].join("\n");
}

export function rateLimitReply(): string {
  return "You've hit today's SMS limit (30/day). Try again tomorrow, or use the Marco app in the meantime.";
}

export function unknownSenderReply(): string {
  return `Hi! This number isn't linked to a Marco account yet. Open the Marco app, go to Profile, and verify this phone number to start texting recipes.`;
}
