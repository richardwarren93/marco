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

    if (!body.collection_id || !body.recipe_id) {
      return NextResponse.json(
        { error: "collection_id and recipe_id are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify user owns the collection
    const { data: collection } = await admin
      .from("collections")
      .select("id")
      .eq("id", body.collection_id)
      .eq("user_id", user.id)
      .single();

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const { error, data } = await admin
      .from("collection_recipes")
      .insert({
        collection_id: body.collection_id,
        recipe_id: body.recipe_id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ collectionRecipe: data });
  } catch (error) {
    console.error("Add recipe to collection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add recipe to collection" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.collection_id || !body.recipe_id) {
      return NextResponse.json(
        { error: "collection_id and recipe_id are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify user owns the collection
    const { data: collection } = await admin
      .from("collections")
      .select("id")
      .eq("id", body.collection_id)
      .eq("user_id", user.id)
      .single();

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("collection_recipes")
      .delete()
      .eq("collection_id", body.collection_id)
      .eq("recipe_id", body.recipe_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove recipe from collection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove recipe from collection" },
      { status: 500 }
    );
  }
}
