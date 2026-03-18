import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data: collection, error } = await admin
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const isOwner = user.id === collection.user_id;

    // Fetch recipes in collection
    const { data: collectionRecipes } = await admin
      .from("collection_recipes")
      .select("recipe_id")
      .eq("collection_id", id);

    let recipes: unknown[] = [];
    if (collectionRecipes && collectionRecipes.length > 0) {
      const recipeIds = collectionRecipes.map((cr) => cr.recipe_id);
      const { data: recipesData } = await admin
        .from("recipes")
        .select("*")
        .in("id", recipeIds);
      recipes = recipesData || [];
    }

    return NextResponse.json({ collection, recipes, isOwner });
  } catch (error) {
    console.error("Fetch collection detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch collection" },
      { status: 500 }
    );
  }
}
