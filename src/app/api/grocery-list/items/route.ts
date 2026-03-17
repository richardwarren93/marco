import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH: toggle checked state
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, checked } = body;

    if (!id || typeof checked !== "boolean") {
      return NextResponse.json({ error: "id and checked required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the item belongs to user's list
    const { data: item } = await admin
      .from("grocery_items")
      .select("*, list:grocery_lists!inner(user_id)")
      .eq("id", id)
      .single();

    if (!item || (item as any).list?.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("grocery_items")
      .update({ checked })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update item" },
      { status: 500 }
    );
  }
}

// POST: add custom item
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
    const { list_id, name, amount, unit } = body;

    if (!list_id || !name) {
      return NextResponse.json({ error: "list_id and name required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the list belongs to user
    const { data: list } = await admin
      .from("grocery_lists")
      .select("user_id")
      .eq("id", list_id)
      .single();

    if (!list || list.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: item, error } = await admin
      .from("grocery_items")
      .insert({
        list_id,
        name: name.toLowerCase().trim(),
        amount: amount || null,
        unit: unit || null,
        category: "other",
        recipe_sources: [],
        checked: false,
        is_custom: true,
        in_pantry: false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add item" },
      { status: 500 }
    );
  }
}

// DELETE: remove an item
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: item } = await admin
      .from("grocery_items")
      .select("*, list:grocery_lists!inner(user_id)")
      .eq("id", id)
      .single();

    if (!item || (item as any).list?.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await admin.from("grocery_items").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete item" },
      { status: 500 }
    );
  }
}
