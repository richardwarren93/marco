import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      source_url: body.source_url || null,
      source_platform: body.source_platform || null,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ recipe: data });
  } catch (error) {
    console.error("Save recipe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save" },
      { status: 500 }
    );
  }
}
