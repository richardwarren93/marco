import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const { error, data } = await supabase.from("recipes").insert({
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
      image_url: body.image_url || null,
      notes: body.notes || null,
    }).select().single();

    if (error) throw error;

    // Insert activity feed entry for social feed
    try {
      const admin = createAdminClient();
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
