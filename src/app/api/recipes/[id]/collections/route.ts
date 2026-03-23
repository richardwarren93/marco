import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recipeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // Find all collection_recipes entries for this recipe
    const { data: entries } = await admin
      .from("collection_recipes")
      .select("collection_id")
      .eq("recipe_id", recipeId);

    if (!entries || entries.length === 0) {
      return NextResponse.json({ collections: [] });
    }

    const collectionIds = entries.map((e) => e.collection_id);

    // Fetch the collections (only ones owned by this user)
    const { data: collections } = await admin
      .from("collections")
      .select("id, name")
      .in("id", collectionIds)
      .eq("user_id", user.id);

    return NextResponse.json({ collections: collections || [] });
  } catch (error) {
    console.error("Fetch recipe collections error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
