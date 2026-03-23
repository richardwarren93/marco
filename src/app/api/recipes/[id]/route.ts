import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/recipes/:id
 * Returns a recipe if the current user owns it OR is in the same household as the owner.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Fetch the recipe (bypasses RLS)
  const { data: recipe, error } = await admin
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Own recipe — return immediately
  if (recipe.user_id === user.id) {
    return NextResponse.json({ recipe });
  }

  // Check if the recipe owner is in the same household
  const { data: myMembership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (myMembership) {
    const { data: ownerMembership } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", recipe.user_id)
      .eq("household_id", myMembership.household_id)
      .single();

    if (ownerMembership) {
      return NextResponse.json({ recipe });
    }
  }

  // Check if recipe was shared with this user via friend sharing
  const { data: share } = await admin
    .from("recipe_shares")
    .select("id")
    .eq("recipe_id", id)
    .eq("shared_with_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (share) {
    return NextResponse.json({ recipe });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
