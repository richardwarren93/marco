import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/collections/recipe-ids
 * Returns a flat array of all recipe IDs that are in any of the user's collections.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's collection IDs first
  const { data: collections } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id);

  if (!collections || collections.length === 0) {
    return NextResponse.json({ recipe_ids: [] });
  }

  const collectionIds = collections.map((c) => c.id);

  // Get all recipe IDs in those collections
  const { data: items } = await supabase
    .from("collection_recipes")
    .select("recipe_id")
    .in("collection_id", collectionIds);

  const recipeIds = [...new Set((items || []).map((i) => i.recipe_id))];

  return NextResponse.json({ recipe_ids: recipeIds });
}
