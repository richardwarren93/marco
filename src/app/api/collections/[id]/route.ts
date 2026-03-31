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

    // Fetch recipes in collection (with added_at for ordering)
    const { data: collectionRecipes } = await admin
      .from("collection_recipes")
      .select("recipe_id, added_at")
      .eq("collection_id", id)
      .order("added_at", { ascending: false });

    let recipes: unknown[] = [];
    const isRecentlyMade = collection.name === "Recently Made" && isOwner;

    if (collectionRecipes && collectionRecipes.length > 0) {
      const recipeIds = collectionRecipes.map((cr) => cr.recipe_id);
      const { data: recipesData } = await admin
        .from("recipes")
        .select("*")
        .in("id", recipeIds);

      if (recipesData) {
        // Build a map of recipe_id -> added_at for ordering
        const addedAtMap = new Map(
          collectionRecipes.map((cr) => [cr.recipe_id, cr.added_at])
        );

        // Sort recipes by added_at (most recent first) for Recently Made
        recipes = recipesData
          .map((r) => ({
            ...r,
            ...(isRecentlyMade ? { last_made_at: addedAtMap.get(r.id) } : {}),
          }))
          .sort((a, b) => {
            const aDate = addedAtMap.get((a as { id: string }).id) || "";
            const bDate = addedAtMap.get((b as { id: string }).id) || "";
            return bDate > aDate ? 1 : -1;
          });
      }
    }

    return NextResponse.json({ collection, recipes, isOwner, isRecentlyMade });
  } catch (error) {
    console.error("Fetch collection detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch collection" },
      { status: 500 }
    );
  }
}
