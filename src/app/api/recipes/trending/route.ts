import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Find recipes that multiple users have saved (same title, different users)
  // Group by normalized title to find commonly saved recipes
  const { data: recipes } = await admin
    .from("recipes")
    .select("id, title, description, image_url, tags, meal_type, servings, prep_time_minutes, cook_time_minutes, source_url, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ trending: [] });
  }

  // Group by normalized title to find popular recipes
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
  }>();

  for (const recipe of recipes) {
    const normalizedTitle = recipe.title.toLowerCase().trim().replace(/[^\w\s]/g, "");
    const existing = titleMap.get(normalizedTitle);

    if (existing) {
      existing.users.add(recipe.user_id);
      existing.saveCount++;
      // Keep the version with the best image
      if (!existing.image_url && recipe.image_url) {
        existing.image_url = recipe.image_url;
        existing.recipeId = recipe.id;
      }
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
      });
    }
  }

  // Sort by number of unique users who saved it, then by total saves
  const trending = [...titleMap.values()]
    .filter((r) => r.users.size >= 1) // Show all for now, can raise threshold later
    .sort((a, b) => {
      if (b.users.size !== a.users.size) return b.users.size - a.users.size;
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
      userCount: r.users.size,
    }));

  return NextResponse.json({ trending }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
