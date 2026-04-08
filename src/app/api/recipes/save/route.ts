import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rehostIfExpiring } from "@/lib/image-rehost";

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
    const admin = createAdminClient();

    // Check for duplicate URL (same user + same source_url)
    if (body.source_url) {
      const { data: existing } = await admin
        .from("recipes")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("source_url", body.source_url)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `You've already saved this recipe: "${existing.title}"`, duplicate: true, recipeId: existing.id },
          { status: 409 }
        );
      }
    }

    // Re-host any image from an expiring CDN (Instagram, TikTok, etc.) to
    // our Supabase storage so it never expires.
    const persistentImageUrl = await rehostIfExpiring(body.image_url);

    const { error, data } = await admin.from("recipes").insert({
      user_id: user.id,
      title: body.title,
      description: body.description || null,
      ingredients: body.ingredients,
      steps: body.steps,
      servings: body.servings || null,
      prep_time_minutes: body.prep_time_minutes || null,
      cook_time_minutes: body.cook_time_minutes || null,
      tags: body.tags || [],
      meal_type: body.meal_type || "dinner",
      source_url: body.source_url || null,
      source_platform: body.source_platform || null,
      image_url: persistentImageUrl,
      notes: body.notes || null,
      calories: body.calories || null,
      protein_g: body.protein_g || null,
      carbs_g: body.carbs_g || null,
      fat_g: body.fat_g || null,
      fiber_g: body.fiber_g || null,
    }).select().single();

    if (error) throw error;

    // Insert activity feed entry for social feed
    try {
      await admin.from("activity_feed").insert({
        user_id: user.id,
        activity_type: "saved_recipe",
        recipe_id: data.id,
      });
    } catch {
      // Non-critical: don't fail recipe save if activity insert fails
    }

    return NextResponse.json({ recipe: data });
  } catch (error) {
    console.error("Save recipe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save" },
      { status: 500 }
    );
  }
}
