import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const admin = createAdminClient();

    const { data: collection, error } = await admin
      .from("collections")
      .select("*")
      .eq("share_token", token)
      .eq("is_public", true)
      .single();

    if (error || !collection) {
      return NextResponse.json(
        { error: "Collection not found or is no longer public." },
        { status: 404 }
      );
    }

    // Fetch recipes in collection
    const { data: collectionRecipes } = await admin
      .from("collection_recipes")
      .select("recipe_id")
      .eq("collection_id", collection.id);

    let recipes: unknown[] = [];
    if (collectionRecipes && collectionRecipes.length > 0) {
      const recipeIds = collectionRecipes.map((cr) => cr.recipe_id);
      const { data: recipesData } = await admin
        .from("recipes")
        .select("id, title, description, tags, cook_time_minutes, prep_time_minutes, servings, image_url, source_platform")
        .in("id", recipeIds);
      recipes = recipesData || [];
    }

    return NextResponse.json({ collection, recipes });
  } catch (error) {
    console.error("Fetch shared collection error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}
