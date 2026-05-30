import { NextResponse, after } from "next/server";
import { scrapeUrl, detectPlatform } from "@/lib/scraper";
import { extractMultipleRecipes } from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rehostIfExpiring, isExpiringCdn } from "@/lib/image-rehost";
import { findExistingRecipeByFingerprint } from "@/lib/recipes/dedup";
import type { Recipe } from "@/types";

const MAX_URLS = 10;

interface Candidate {
  recipe: Partial<Recipe>;
  source_url: string;
  source_platform: ReturnType<typeof detectPlatform>;
  image_url: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls
          .filter((u: unknown): u is string => typeof u === "string")
          .map((u: string) => u.trim())
          .filter(Boolean)
          .slice(0, MAX_URLS)
      : [];

    if (urls.length === 0) {
      return NextResponse.json({ error: "No recipe links provided" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Scrape + extract each URL in parallel. One bad link shouldn't sink the
    // batch, so failures are swallowed per-URL.
    const perUrl = await Promise.allSettled(
      urls.map(async (url): Promise<Candidate[]> => {
        const { content, image_url } = await scrapeUrl(url);
        const recipes = await extractMultipleRecipes(content, url);
        return recipes.map((recipe) => ({
          recipe,
          source_url: url,
          source_platform: detectPlatform(url),
          image_url: image_url || null,
        }));
      })
    );

    const candidates: Candidate[] = perUrl
      .filter((r): r is PromiseFulfilledResult<Candidate[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const saved: { id: string; title: string; image_url: string | null }[] = [];

    for (const { recipe, source_url, source_platform, image_url } of candidates) {
      if (!recipe?.title) continue;

      const existing = await findExistingRecipeByFingerprint(admin, user.id, {
        title: recipe.title,
        source_url,
        image_url: image_url || undefined,
      });
      if (existing) continue;

      const { data, error } = await admin
        .from("recipes")
        .insert({
          user_id: user.id,
          title: recipe.title,
          description: recipe.description || null,
          ingredients: recipe.ingredients || [],
          steps: recipe.steps || [],
          servings: recipe.servings || null,
          prep_time_minutes: recipe.prep_time_minutes || null,
          cook_time_minutes: recipe.cook_time_minutes || null,
          tags: recipe.tags || [],
          meal_type: recipe.meal_type || "dinner",
          source_url,
          source_platform,
          image_url,
          calories: recipe.calories || null,
          protein_g: recipe.protein_g || null,
          carbs_g: recipe.carbs_g || null,
          fat_g: recipe.fat_g || null,
          fiber_g: recipe.fiber_g || null,
        })
        .select("id, title, image_url")
        .single();

      if (error || !data) {
        console.error("Onboarding import: failed to insert recipe", error);
        continue;
      }

      saved.push(data);

      // Best-effort activity feed entry.
      try {
        await admin.from("activity_feed").insert({
          user_id: user.id,
          activity_type: "saved_recipe",
          recipe_id: data.id,
        });
      } catch {
        /* non-critical */
      }

      // Rehost expiring CDN images in the background so they don't 404 later.
      if (isExpiringCdn(image_url)) {
        const recipeId = data.id;
        const original = image_url;
        after(async () => {
          const persistent = await rehostIfExpiring(original);
          if (persistent && persistent !== original) {
            await admin.from("recipes").update({ image_url: persistent }).eq("id", recipeId);
          }
        });
      }
    }

    return NextResponse.json({ saved: saved.length, recipes: saved });
  } catch (err) {
    console.error("Onboarding import error:", err);
    return NextResponse.json({ error: "Failed to import recipes" }, { status: 500 });
  }
}
