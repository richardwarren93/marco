import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/recipes/:id
 * - Owner: full recipe (notes, ratings, etc. — fetched separately by their endpoints)
 * - Non-owner: sanitized public view — only the "on-the-card" fields, no
 *   private notes, no ownership info, no personal data.
 */
const PUBLIC_FIELDS = [
  "id",
  "title",
  "description",
  "image_url",
  "tags",
  "meal_type",
  "servings",
  "prep_time_minutes",
  "cook_time_minutes",
  "ingredients",
  "steps",
  "source_url",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
] as const;

function sanitizePublic(recipe: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { is_public_view: true };
  for (const key of PUBLIC_FIELDS) {
    if (key in recipe) out[key] = recipe[key];
  }
  return out;
}

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

  const { data: recipe, error } = await admin
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Owner gets the full recipe
  if (recipe.user_id === user.id) {
    return NextResponse.json({ recipe });
  }

  // Same household → full recipe (they cook together)
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

  // Everyone else (friends, community, strangers) gets the sanitized public view
  return NextResponse.json({ recipe: sanitizePublic(recipe) });
}
