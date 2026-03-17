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

    // Get recipe shares sent to this user
    const { data: shares, error } = await admin
      .from("recipe_shares")
      .select("*")
      .eq("shared_with_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!shares || shares.length === 0) {
      return NextResponse.json({ shares: [] });
    }

    // Get recipe details
    const recipeIds = shares.map((s) => s.recipe_id);
    const { data: recipes } = await admin
      .from("recipes")
      .select("id, title, description, tags, image_url, source_platform, prep_time_minutes, cook_time_minutes, servings")
      .in("id", recipeIds);

    // Get sender profiles
    const senderIds = [...new Set(shares.map((s) => s.shared_by_user_id))];
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", senderIds);

    const recipeMap = new Map((recipes || []).map((r) => [r.id, r]));
    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    const enriched = shares.map((s) => ({
      ...s,
      recipe: recipeMap.get(s.recipe_id) || null,
      shared_by: profileMap.get(s.shared_by_user_id) || null,
    }));

    // Mark as seen
    const unseenIds = shares
      .filter((s) => !s.seen)
      .map((s) => s.id);
    if (unseenIds.length > 0) {
      await admin
        .from("recipe_shares")
        .update({ seen: true })
        .in("id", unseenIds);
    }

    return NextResponse.json({ shares: enriched });
  } catch (error) {
    console.error("Shared with me error:", error);
    return NextResponse.json(
      { error: "Failed to load shared recipes" },
      { status: 500 }
    );
  }
}
