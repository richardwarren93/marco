import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
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
    const body = await request.json();
    const admin = createAdminClient();

    // Verify restaurant ownership
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("restaurant_visits")
      .insert({
        restaurant_id: id,
        user_id: user.id,
        visited_at: body.visited_at || new Date().toISOString().split("T")[0],
        rating: body.rating || null,
        dishes_ordered: body.dishes_ordered || [],
        notes: body.notes || null,
        companions: body.companions || null,
        occasion: body.occasion || null,
        spent_approx: body.spent_approx || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-update restaurant status to "visited" if it was "wishlist"
    await admin
      .from("restaurants")
      .update({ status: "visited" })
      .eq("id", id)
      .eq("status", "wishlist");

    return NextResponse.json({ visit: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to log visit" },
      { status: 500 }
    );
  }
}
