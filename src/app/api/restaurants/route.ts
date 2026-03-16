import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const cuisine = searchParams.get("cuisine");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "updated_at";

  let query = admin
    .from("restaurants")
    .select("*")
    .eq("user_id", user.id);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (cuisine) {
    query = query.eq("cuisine", cuisine);
  }
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,cuisine.ilike.%${search}%,neighborhood.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  switch (sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "rating":
      query = query.order("overall_rating", { ascending: false, nullsFirst: false });
      break;
    case "recent_visit":
      query = query.order("updated_at", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get visit counts + last visited for each restaurant
  const restaurantIds = (data || []).map((r) => r.id);
  if (restaurantIds.length > 0) {
    const { data: visits } = await admin
      .from("restaurant_visits")
      .select("restaurant_id, visited_at")
      .in("restaurant_id", restaurantIds)
      .order("visited_at", { ascending: false });

    const visitMap: Record<string, { count: number; last: string | null }> = {};
    (visits || []).forEach((v) => {
      if (!visitMap[v.restaurant_id]) {
        visitMap[v.restaurant_id] = { count: 0, last: v.visited_at };
      }
      visitMap[v.restaurant_id].count++;
    });

    data?.forEach((r) => {
      const info = visitMap[r.id];
      r.visit_count = info?.count || 0;
      r.last_visited = info?.last || null;
    });
  }

  return NextResponse.json({ restaurants: data || [] });
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

    const { data, error } = await admin
      .from("restaurants")
      .insert({
        user_id: user.id,
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
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ restaurant: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
