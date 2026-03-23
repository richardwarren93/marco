import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Helper: check if two users are in the same household
async function isInSameHousehold(admin: any, userId1: string, userId2: string): Promise<boolean> {
  const { data: m1 } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId1)
    .single();
  if (!m1) return false;
  const { data: m2 } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId2)
    .eq("household_id", m1.household_id)
    .single();
  return !!m2;
}

// Helper: resolve item + verify access
async function resolveItem(admin: any, id: string, userId: string) {
  const { data: item } = await admin
    .from("grocery_items")
    .select("*, list:grocery_lists!inner(user_id)")
    .eq("id", id)
    .single();

  if (!item) return { item: null, hasAccess: false };

  const listOwnerId = (item as any).list?.user_id;
  let hasAccess = listOwnerId === userId;
  if (!hasAccess) {
    hasAccess = await isInSameHousehold(admin, userId, listOwnerId);
  }
  return { item, hasAccess };
}

// ─── PATCH: toggle checked OR save item edits ─────────────────────────────────
// { id, checked }                                           → toggle checked
// { id, name, amount, unit, category }                     → edit item
//   → generated items: stored as overrides (name_override, etc.)
//   → manual items: direct field update
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const admin = createAdminClient();
    const { item, hasAccess } = await resolveItem(admin, id, user.id);

    if (!item || !hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Toggle checked
    if (typeof body.checked === "boolean") {
      const { error } = await admin
        .from("grocery_items")
        .update({ checked: body.checked })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Edit item — use overrides for generated items, direct update for manual
    const { name, amount, unit, category } = body;
    if (name !== undefined || amount !== undefined || unit !== undefined || category !== undefined) {
      let updates: Record<string, unknown>;

      if (item.is_custom) {
        // Manual item: direct mutation
        updates = {
          ...(name !== undefined && { name: (name as string).toLowerCase().trim() }),
          ...(amount !== undefined && { amount: amount || null }),
          ...(unit !== undefined && { unit: unit || null }),
          ...(category !== undefined && { category: category || null }),
        };
      } else {
        // Generated item: store as overrides
        updates = {
          ...(name !== undefined && { name_override: name ? (name as string).trim() : null }),
          ...(amount !== undefined && { amount_override: amount || null }),
          ...(unit !== undefined && { unit_override: unit || null }),
          ...(category !== undefined && { category_override: category || null }),
        };
      }

      const { error } = await admin.from("grocery_items").update(updates).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update item" },
      { status: 500 }
    );
  }
}

// ─── POST: add manual item ────────────────────────────────────────────────────
// Body: { name, quantity?, unit?, category?, list_id? | date_start? }
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, quantity, unit, category } = body;
    // Accept both legacy "amount" and new "quantity"
    const amount = body.amount ?? quantity;
    let { list_id } = body;
    const date_start = body.date_start ?? body.week_start;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!list_id && !date_start) {
      return NextResponse.json({ error: "list_id or date_start required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Auto-create list if only date_start given
    if (!list_id && date_start) {
      const date_end = body.date_end ?? (() => {
        const d = new Date(date_start + "T00:00:00");
        d.setDate(d.getDate() + 6);
        return d.toISOString().split("T")[0];
      })();

      const { data: existingList } = await admin
        .from("grocery_lists")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start", date_start)
        .single();

      if (existingList) {
        list_id = existingList.id;
      } else {
        const { data: newList, error: createError } = await admin
          .from("grocery_lists")
          .insert({ user_id: user.id, week_start: date_start, date_end })
          .select()
          .single();
        if (createError || !newList) throw createError || new Error("Failed to create list");
        list_id = newList.id;
      }
    }

    // Verify ownership
    const { data: list } = await admin
      .from("grocery_lists")
      .select("id, user_id")
      .eq("id", list_id)
      .single();
    if (!list || list.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: item, error } = await admin
      .from("grocery_items")
      .insert({
        list_id,
        name: (name as string).toLowerCase().trim(),
        amount: amount || null,
        unit: unit || null,
        category: category || "other",
        recipe_sources: [],
        checked: false,
        is_custom: true,
        in_pantry: false,
        soft_deleted: false,
        name_override: null,
        amount_override: null,
        unit_override: null,
        category_override: null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item, list_id: list.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add item" },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
// Single item:  { id }         → soft/hard delete one item
// Clear all:    { list_id }    → delete all items in the list (owned by user)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const admin = createAdminClient();

    // ── Clear all items in a list ──────────────────────────────────────────
    if (body.list_id && !body.id) {
      const { list_id } = body;

      // Verify ownership
      const { data: list } = await admin
        .from("grocery_lists")
        .select("id, user_id")
        .eq("id", list_id)
        .single();
      if (!list || list.user_id !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Hard-delete manual items
      await admin.from("grocery_items").delete().eq("list_id", list_id).eq("is_custom", true);
      // Soft-delete generated items
      await admin.from("grocery_items").update({ soft_deleted: true }).eq("list_id", list_id).eq("is_custom", false);

      return NextResponse.json({ success: true });
    }

    // ── Single item delete ─────────────────────────────────────────────────
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id or list_id required" }, { status: 400 });

    const { item, hasAccess } = await resolveItem(admin, id, user.id);

    if (!item || !hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (item.is_custom) {
      // Manual item → hard delete
      const { error } = await admin.from("grocery_items").delete().eq("id", id);
      if (error) throw error;
    } else {
      // Generated item → soft delete (fallback to hard delete if column not yet migrated)
      const { error: softErr } = await admin
        .from("grocery_items")
        .update({ soft_deleted: true })
        .eq("id", id);
      if (softErr) {
        // Migration not run — hard delete as fallback
        const { error: hardErr } = await admin.from("grocery_items").delete().eq("id", id);
        if (hardErr) throw hardErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete item" },
      { status: 500 }
    );
  }
}
