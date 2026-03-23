import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Recipe id is required" }, { status: 400 });
    }

    const { error, data } = await supabase
      .from("recipes")
      .update({
        title: body.title,
        description: body.description || null,
        ingredients: body.ingredients,
        steps: body.steps,
        servings: body.servings || null,
        prep_time_minutes: body.prep_time_minutes || null,
        cook_time_minutes: body.cook_time_minutes || null,
        tags: body.tags || [],
        meal_type: body.meal_type || "dinner",
        notes: body.notes || null,
        image_url: body.image_url || null,
      })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ recipe: data });
  } catch (error) {
    console.error("Update recipe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 }
    );
  }
}
