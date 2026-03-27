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

    // Single query: get all collections
    const { data: cols, error } = await admin
      .from("collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!cols || cols.length === 0) {
      return NextResponse.json({ collections: [] }, {
        headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
      });
    }

    // Two bulk queries instead of 3 per collection (N+1 → 2 total)
    const colIds = cols.map((c) => c.id);

    const [{ data: allCR }, { data: previewCR }] = await Promise.all([
      // Count: get all collection_recipes for these collections
      admin
        .from("collection_recipes")
        .select("collection_id")
        .in("collection_id", colIds),
      // Preview images: get recent recipe IDs per collection (we'll take first 4 per group)
      admin
        .from("collection_recipes")
        .select("collection_id, recipe:recipes(image_url)")
        .in("collection_id", colIds)
        .order("added_at", { ascending: false }),
    ]);

    // Build counts map
    const countMap = new Map<string, number>();
    for (const row of allCR || []) {
      countMap.set(row.collection_id, (countMap.get(row.collection_id) || 0) + 1);
    }

    // Build preview images map (max 4 per collection)
    const previewMap = new Map<string, string[]>();
    for (const row of previewCR || []) {
      const colId = row.collection_id;
      const images = previewMap.get(colId) || [];
      const recipe = row.recipe as unknown as { image_url: string | null } | null;
      const imgUrl = recipe?.image_url;
      if (imgUrl && images.length < 4) {
        images.push(imgUrl);
        previewMap.set(colId, images);
      }
    }

    const withCountsAndPreviews = cols.map((col) => ({
      ...col,
      recipe_count: countMap.get(col.id) || 0,
      preview_images: previewMap.get(col.id) || [],
    }));

    return NextResponse.json({ collections: withCountsAndPreviews }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
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
