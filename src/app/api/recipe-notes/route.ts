import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipeId = request.nextUrl.searchParams.get("recipe_id");
  if (!recipeId) {
    return NextResponse.json({ error: "recipe_id required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("recipe_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .single();

  return NextResponse.json({ note: data || null });
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

    if (!body.recipe_id) {
      return NextResponse.json(
        { error: "recipe_id is required" },
        { status: 400 }
      );
    }

    if (body.personal_rating !== undefined && body.personal_rating !== null) {
      if (body.personal_rating < 1 || body.personal_rating > 5) {
        return NextResponse.json(
          { error: "personal_rating must be 1-5" },
          { status: 400 }
        );
      }
    }

    const admin = createAdminClient();
    const { error, data } = await admin
      .from("recipe_notes")
      .upsert(
        {
          user_id: user.id,
          recipe_id: body.recipe_id,
          private_note: body.private_note ?? "",
          personal_rating: body.personal_rating ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,recipe_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (error) {
    console.error("Recipe note error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save note" },
      { status: 500 }
    );
  }
}
