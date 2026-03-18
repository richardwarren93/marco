import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
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

  const admin = createAdminClient();

  const { data: restaurant, error } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // Get all visits for this restaurant
  const { data: visits } = await admin
    .from("restaurant_visits")
    .select("*")
    .eq("restaurant_id", id)
    .order("visited_at", { ascending: false });

  restaurant.visits = visits || [];
  restaurant.visit_count = (visits || []).length;
  restaurant.last_visited = visits?.[0]?.visited_at || null;

  return NextResponse.json({ restaurant });
}

export async function PUT(
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

    // Verify ownership
    const { data: existing } = await admin
      .from("restaurants")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("restaurants")
      .update({
        name: body.name,
        cuisine: body.cuisine || null,
        neighborhood: body.neighborhood || null,
        address: body.address || null,
        city: body.city || null,
        google_maps_url: body.google_maps_url || null,
        website_url: body.website_url || null,
        phone: body.phone || null,
        price_range: body.price_range || null,
        status: body.status || "wishlist",
        tags: body.tags || [],
        overall_rating: body.overall_rating || null,
        would_go_back: body.would_go_back ?? null,
        notes: body.notes || null,
        image_url: body.image_url || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ restaurant: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update restaurant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  const admin = createAdminClient();

  const { error } = await admin
    .from("restaurants")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
