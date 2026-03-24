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

    // Fetch recipes in collection, ordered by added_at (most recent first)
    const { data: collectionRecipes } = await admin
      .from("collection_recipes")
      .select("recipe_id, added_at")
      .eq("collection_id", id)
      .order("added_at", { ascending: false });

    let recipes: unknown[] = [];
    let addedAtMap: Record<string, string> = {};
    if (collectionRecipes && collectionRecipes.length > 0) {
      const recipeIds = collectionRecipes.map((cr) => cr.recipe_id);
      const { data: recipesData } = await admin
        .from("recipes")
        .select("*")
        .in("id", recipeIds);

      // Build a map of recipe_id -> added_at
      for (const cr of collectionRecipes) {
        addedAtMap[cr.recipe_id] = cr.added_at;
      }

      // Re-sort recipes to match the added_at order
      const orderedIds = collectionRecipes.map((cr) => cr.recipe_id);
      recipes = (recipesData || []).sort(
        (a: { id: string }, b: { id: string }) =>
          orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
      );
    }

    return NextResponse.json({ collection, recipes, isOwner, addedAtMap });
  } catch (error) {
    console.error("Fetch collection detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch collection" },
      { status: 500 }
    );
  }
}
