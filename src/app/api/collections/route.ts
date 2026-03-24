import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data: cols, error } = await admin
      .from("collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch recipe counts + preview images (up to 4 per collection)
    const withCountsAndPreviews = await Promise.all(
      (cols || []).map(async (col) => {
        const [{ count }, { data: previewRows }] = await Promise.all([
          admin
            .from("collection_recipes")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", col.id),
          admin
            .from("collection_recipes")
            .select("recipe_id")
            .eq("collection_id", col.id)
            .order("added_at", { ascending: false })
            .limit(4),
        ]);

        let preview_images: string[] = [];
        if (previewRows && previewRows.length > 0) {
          const { data: recipes } = await admin
            .from("recipes")
            .select("image_url")
            .in("id", previewRows.map((r) => r.recipe_id))
            .not("image_url", "is", null);
          preview_images = (recipes || [])
            .map((r) => r.image_url)
            .filter(Boolean)
            .slice(0, 4);
        }

        return { ...col, recipe_count: count || 0, preview_images };
      })
    );

    return NextResponse.json({ collections: withCountsAndPreviews });
  } catch (error) {
    console.error("Fetch collections error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch collections" },
      { status: 500 }
    );
  }
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
    const admin = createAdminClient();

    const { error, data } = await admin
      .from("collections")
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase collection insert error:", JSON.stringify(error));
      throw new Error(error.message || error.code || "Supabase insert failed");
    }
    return NextResponse.json({ collection: data });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create collection" },
      { status: 500 }
    );
  }
}
