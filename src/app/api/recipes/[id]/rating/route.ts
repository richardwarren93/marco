import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOMATO_REWARDS, TOMATO_DAILY_CAPS } from "@/lib/gamification";
import { awardTomatoes } from "@/lib/tomatoes";

/**
 * Community ratings for a single recipe (the representative recipe_id shown on
 * Discover). Distinct from the private recipe_notes.personal_rating.
 *
 * GET    → { average, count, userRating }
 * POST   { rating: 1..5 } → upsert the caller's rating, returns fresh aggregate
 * DELETE → remove the caller's rating, returns fresh aggregate
 *
 * All handlers are defensive: if the recipe_star_ratings table hasn't been migrated
 * yet they degrade to zeros instead of 500ing, so the app keeps working.
 */

interface Aggregate {
  average: number;
  count: number;
  userRating: number | null;
}

// Postgres "relation does not exist" — table not migrated yet.
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

async function readAggregate(recipeId: string, userId: string): Promise<Aggregate> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recipe_star_ratings")
    .select("rating, user_id")
    .eq("recipe_id", recipeId);

  if (error) {
    if (isMissingTable(error)) return { average: 0, count: 0, userRating: null };
    throw error;
  }

  const rows = data ?? [];
  const count = rows.length;
  const sum = rows.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  const mine = rows.find((r) => r.user_id === userId)?.rating ?? null;
  return { average, count, userRating: mine };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const agg = await readAggregate(id, user.id);
    return NextResponse.json(agg);
  } catch (err) {
    console.error("[rating] GET failed:", err);
    return NextResponse.json({ average: 0, count: 0, userRating: null });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be an integer 1-5" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("recipe_star_ratings")
    .upsert(
      { user_id: user.id, recipe_id: id, rating, updated_at: new Date().toISOString() },
      { onConflict: "user_id,recipe_id" }
    );

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: "Ratings not available yet" }, { status: 503 });
    }
    console.error("[rating] POST failed:", error);
    return NextResponse.json({ error: "Could not save rating" }, { status: 500 });
  }

  // Reward the first rating for this recipe (editing the star value never re-awards),
  // capped daily.
  const award = await awardTomatoes({
    userId: user.id,
    amount: TOMATO_REWARDS.RECIPE_RATING,
    reason: "recipe_rating",
    dedupeKey: id,
    dailyCap: TOMATO_DAILY_CAPS.recipe_rating,
  });

  const agg = await readAggregate(id, user.id);
  return NextResponse.json({
    ...agg,
    tomatoesEarned: award.amount,
    awarded: award.awarded,
    tomatoBalance: award.newBalance,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin
    .from("recipe_star_ratings")
    .delete()
    .eq("recipe_id", id)
    .eq("user_id", user.id);

  if (error && !isMissingTable(error)) {
    console.error("[rating] DELETE failed:", error);
    return NextResponse.json({ error: "Could not remove rating" }, { status: 500 });
  }

  const agg = await readAggregate(id, user.id);
  return NextResponse.json(agg);
}
