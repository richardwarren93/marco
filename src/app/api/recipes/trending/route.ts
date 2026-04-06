import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Taste match keywords (shared with taste-profile API) ────────────────────
const SWEET_KW = ["sweet", "dessert", "honey", "sugar", "chocolate", "caramel", "vanilla", "maple", "fruit", "berry", "cake", "cookie", "pie", "custard", "syrup"];
const SAVORY_KW = ["umami", "savory", "soy", "miso", "mushroom", "broth", "meaty", "bacon", "anchovy", "parmesan", "dashi", "fish sauce", "worcestershire", "steak", "roast"];
const RICHNESS_KW = ["creamy", "cheese", "butter", "cream", "rich", "indulgent", "heavy", "coconut milk", "alfredo", "béchamel", "gratin", "fondue", "mac and cheese", "risotto"];
const TANGY_KW = ["tangy", "citrus", "lemon", "lime", "vinegar", "sour", "pickled", "fermented", "yogurt", "kimchi", "sauerkraut", "ceviche", "tamarind", "sumac"];
const SPICY_KW = ["spicy", "chili", "chilli", "hot", "pepper", "jalapeño", "habanero", "sriracha", "gochujang", "harissa", "cayenne", "sichuan", "szechuan", "wasabi", "chipotle"];

function countHits(text: string, keywords: string[]): number {
  let hits = 0;
  for (const kw of keywords) if (text.includes(kw)) hits++;
  return hits;
}

function scoreTasteMatch(
  recipeText: string,
  userScores: { sweet: number; savory: number; richness: number; tangy: number; spicy: number }
): number {
  const text = recipeText.toLowerCase();
  const hits = {
    sweet: countHits(text, SWEET_KW),
    savory: countHits(text, SAVORY_KW),
    richness: countHits(text, RICHNESS_KW),
    tangy: countHits(text, TANGY_KW),
    spicy: countHits(text, SPICY_KW),
  };

  const totalHits = hits.sweet + hits.savory + hits.richness + hits.tangy + hits.spicy;
  if (totalHits === 0) return 50; // Neutral

  let score = 0;
  let maxPossible = 0;
  for (const key of ["sweet", "savory", "richness", "tangy", "spicy"] as const) {
    const recipeWeight = hits[key] / totalHits;
    score += recipeWeight * userScores[key];
    maxPossible += recipeWeight * 100;
  }

  return maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 50;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch trending recipes + user taste profile in parallel
  const [recipesRes, prefsRes] = await Promise.all([
    admin
      .from("recipes")
      .select("id, title, description, image_url, tags, meal_type, servings, prep_time_minutes, cook_time_minutes, source_url, user_id, created_at, ingredients")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("user_preferences")
      .select("taste_profile")
      .eq("user_id", user.id)
      .single(),
  ]);

  const recipes = recipesRes.data;
  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ trending: [] });
  }

  // Get user's cached taste scores (from biweekly cache or default neutral)
  const tasteProfile = prefsRes.data?.taste_profile as Record<string, unknown> | null;
  const cachedProfile = tasteProfile?.cached_profile as { all?: Record<string, number> } | undefined;
  const userScores = {
    sweet: (cachedProfile?.all?.sweet as number) ?? 50,
    savory: (cachedProfile?.all?.savory as number) ?? 50,
    richness: (cachedProfile?.all?.richness as number) ?? 50,
    tangy: (cachedProfile?.all?.tangy as number) ?? 50,
    spicy: (cachedProfile?.all?.spicy as number) ?? 50,
  };

  // Group by normalized title
  const titleMap = new Map<string, {
    title: string;
    description: string | null;
    image_url: string | null;
    tags: string[];
    meal_type: string;
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    source_url: string | null;
    saveCount: number;
    users: Set<string>;
    recipeId: string;
    searchText: string;
  }>();

  for (const recipe of recipes) {
    const normalizedTitle = recipe.title.toLowerCase().trim().replace(/[^\w\s]/g, "");

    // Build searchable text
    const textParts = [recipe.title, recipe.description || "", ...(recipe.tags || [])];
    if (recipe.ingredients) {
      for (const ing of recipe.ingredients as (string | { name: string })[]) {
        if (typeof ing === "string") textParts.push(ing);
        else if (ing && typeof ing === "object" && "name" in ing) textParts.push(ing.name);
      }
    }
    const searchText = textParts.join(" ");

    const existing = titleMap.get(normalizedTitle);
    if (existing) {
      existing.users.add(recipe.user_id);
      existing.saveCount++;
      if (!existing.image_url && recipe.image_url) {
        existing.image_url = recipe.image_url;
        existing.recipeId = recipe.id;
      }
      existing.searchText += " " + searchText;
    } else {
      titleMap.set(normalizedTitle, {
        title: recipe.title,
        description: recipe.description,
        image_url: recipe.image_url,
        tags: recipe.tags || [],
        meal_type: recipe.meal_type,
        servings: recipe.servings,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        source_url: recipe.source_url,
        saveCount: 1,
        users: new Set([recipe.user_id]),
        recipeId: recipe.id,
        searchText,
      });
    }
  }

  // Score taste match and sort
  const allRecipes = [...titleMap.values()].map((r) => ({
    ...r,
    userCount: r.users.size,
    tasteMatch: scoreTasteMatch(r.searchText, userScores),
  }));

  // Trending: taste match (primary), user count (secondary)
  const trending = allRecipes
    .filter((r) => r.userCount >= 1)
    .sort((a, b) => {
      if (b.tasteMatch !== a.tasteMatch) return b.tasteMatch - a.tasteMatch;
      if (b.userCount !== a.userCount) return b.userCount - a.userCount;
      return b.saveCount - a.saveCount;
    })
    .slice(0, 12)
    .map((r) => ({
      recipeId: r.recipeId,
      title: r.title,
      description: r.description,
      image_url: r.image_url,
      tags: r.tags,
      meal_type: r.meal_type,
      servings: r.servings,
      prep_time_minutes: r.prep_time_minutes,
      cook_time_minutes: r.cook_time_minutes,
      source_url: r.source_url,
      saveCount: r.saveCount,
      userCount: r.userCount,
      tasteMatch: r.tasteMatch,
    }));

  return NextResponse.json({ trending }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
