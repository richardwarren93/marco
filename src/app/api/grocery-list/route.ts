import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateIngredients } from "@/lib/groceryAggregator";
import type { Ingredient, PantryItem, Recipe } from "@/types";

// ─── Helper: fetch items, gracefully handling missing soft_deleted column ─────
async function fetchItems(admin: ReturnType<typeof createAdminClient>, listId: string) {
  // Try with soft_deleted filter (v2 schema)
  const { data, error } = await admin
    .from("grocery_items")
    .select("*")
    .eq("list_id", listId)
    .eq("soft_deleted", false)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (!error) return data || [];

  // Migration not yet run — return all items
  const { data: fallback } = await admin
    .from("grocery_items")
    .select("*")
    .eq("list_id", listId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  return fallback || [];
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const dateStart = params.get("date_start") ?? params.get("week_start");
  if (!dateStart) return NextResponse.json({ error: "date_start required" }, { status: 400 });

  const dateEnd = params.get("date_end") ?? (() => {
    const d = new Date(dateStart + "T12:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  })();

  const admin = createAdminClient();

  const { data: list } = await admin
    .from("grocery_lists")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", dateStart)
    .single();

  const ownItems = list ? await fetchItems(admin, list.id) : [];

  // Household membership
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  // Detect meal plan changes since last generation (own + household)
  let meal_plan_changed = false;
  if (list?.generated_at) {
    const changeCheckIds = [user.id];
    if (membership) {
      const { data: allMembers } = await admin
        .from("household_members")
        .select("user_id")
        .eq("household_id", membership.household_id);
      if (allMembers) {
        for (const m of allMembers) {
          if (!changeCheckIds.includes(m.user_id)) changeCheckIds.push(m.user_id);
        }
      }
    }
    const { data: latestPlan } = await admin
      .from("meal_plans")
      .select("created_at")
      .in("user_id", changeCheckIds)
      .gte("planned_date", dateStart)
      .lte("planned_date", dateEnd)
      .gt("created_at", list.generated_at)
      .limit(1)
      .maybeSingle();
    if (latestPlan) meal_plan_changed = true;
  }

  let householdItems: any[] = [];
  let householdMembers: any[] = [];

  if (membership) {
    const { data: members } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", membership.household_id)
      .neq("user_id", user.id);

    if (members && members.length > 0) {
      const memberIds = members.map((m: any) => m.user_id);
      const { data: profiles } = await admin
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", memberIds);
      householdMembers = profiles || [];

      const { data: memberLists } = await admin
        .from("grocery_lists")
        .select("*")
        .in("user_id", memberIds)
        .eq("week_start", dateStart);

      if (memberLists && memberLists.length > 0) {
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
        const listOwnerMap = new Map(memberLists.map((l: any) => [l.id, l.user_id]));
        const allMemberItems: any[] = [];
        for (const ml of memberLists) {
          const mlItems = await fetchItems(admin, ml.id);
          for (const item of mlItems) {
            allMemberItems.push({
              ...item,
              owner_name: profileMap.get(listOwnerMap.get(item.list_id)) || "Housemate",
            });
          }
        }
        householdItems = allMemberItems;
      }
    }
  }

  return NextResponse.json({ list, items: ownItems, householdItems, householdMembers, meal_plan_changed });
}

// ─── POST (generate / regenerate) ────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const dateStart: string = body.date_start ?? body.week_start;
    if (!dateStart) return NextResponse.json({ error: "date_start required" }, { status: 400 });

    const dateEnd: string = body.date_end ?? (() => {
      const d = new Date(dateStart + "T12:00:00");
      d.setDate(d.getDate() + 6);
      return d.toISOString().split("T")[0];
    })();

    const admin = createAdminClient();

    // ── Resolve household member IDs (if any) ────────────────────────────────
    const planUserIds = [user.id];
    const { data: membership } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single();

    if (membership) {
      const { data: members } = await admin
        .from("household_members")
        .select("user_id")
        .eq("household_id", membership.household_id);
      if (members) {
        for (const m of members) {
          if (!planUserIds.includes(m.user_id)) planUserIds.push(m.user_id);
        }
      }
    }

    // ── Fetch meal plans (own + household) ─────────────────────────────────
    const { data: plans } = await admin
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .in("user_id", planUserIds)
      .gte("planned_date", dateStart)
      .lte("planned_date", dateEnd)
      .not("recipe_id", "is", null);

    if (!plans || plans.length === 0) {
      return NextResponse.json({ error: "No meals planned for this range" }, { status: 400 });
    }

    // ── Fetch pantry items ────────────────────────────────────────────────────
    const { data: pantryItems } = await admin
      .from("pantry_items")
      .select("*")
      .eq("user_id", user.id);

    // ── Aggregate ingredients ─────────────────────────────────────────────────
    const recipeIngredients = plans
      .filter((p) => p.recipe)
      .map((p) => ({
        recipeTitle: (p.recipe as Recipe).title,
        ingredients: (p.recipe as Recipe).ingredients as Ingredient[],
      }));

    const aggregated = aggregateIngredients(recipeIngredients, (pantryItems as PantryItem[]) || []);

    // ── Step 1: Upsert grocery list with ORIGINAL columns only ────────────────
    // (safe even if v2 migration hasn't been run)
    const { data: list, error: listError } = await admin
      .from("grocery_lists")
      .upsert(
        { user_id: user.id, week_start: dateStart, updated_at: new Date().toISOString() },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();

    if (listError || !list) throw listError || new Error("Failed to create grocery list");

    // ── Step 2: Update v2 tracking columns (silently skip if not migrated) ────
    await admin
      .from("grocery_lists")
      .update({ date_end: dateEnd, generated_at: new Date().toISOString(), meal_count: plans.length })
      .eq("id", list.id)
      .then(() => {}, () => {}); // swallow error if columns don't exist

    // ── Step 3: Load existing items to preserve user state ────────────────────
    const { data: existingItems } = await admin
      .from("grocery_items")
      .select("*")
      .eq("list_id", list.id);

    const existing = existingItems || [];

    const softDeletedNames = new Set(
      existing.filter((i: any) => !i.is_custom && i.soft_deleted).map((i: any) => i.name)
    );
    const checkedNames = new Set(
      existing.filter((i: any) => !i.is_custom && i.checked && !i.soft_deleted).map((i: any) => i.name)
    );
    type Override = { name_override: string | null; amount_override: string | null; unit_override: string | null; category_override: string | null };
    const overrideMap = new Map<string, Override>(
      existing
        .filter((i: any) => !i.is_custom && (i.name_override || i.amount_override || i.unit_override || i.category_override))
        .map((i: any) => [i.name, { name_override: i.name_override, amount_override: i.amount_override, unit_override: i.unit_override, category_override: i.category_override }])
    );

    // ── Step 4: Delete existing generated items ───────────────────────────────
    await admin.from("grocery_items").delete().eq("list_id", list.id).eq("is_custom", false);

    // ── Step 5: Insert new items (v2 columns with fallback to base schema) ────
    if (aggregated.length > 0) {
      const baseItems = aggregated.map((item) => ({
        list_id: list.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        recipe_sources: item.recipeSources,
        checked: checkedNames.has(item.name),
        is_custom: false,
        in_pantry: item.inPantry,
      }));

      const v2Items = baseItems.map((base, idx) => {
        const name = aggregated[idx].name;
        const ov = overrideMap.get(name);
        return {
          ...base,
          soft_deleted: softDeletedNames.has(name),
          name_override: ov?.name_override ?? null,
          amount_override: ov?.amount_override ?? null,
          unit_override: ov?.unit_override ?? null,
          category_override: ov?.category_override ?? null,
        };
      });

      // Try v2 insert first; if v2 columns don't exist, fall back to base
      const { error: v2Err } = await admin.from("grocery_items").insert(v2Items);
      if (v2Err) {
        const { error: baseErr } = await admin.from("grocery_items").insert(baseItems);
        if (baseErr) throw baseErr;
      }
    }

    // ── Step 6: Fetch final items ─────────────────────────────────────────────
    const finalItems = await fetchItems(admin, list.id);

    // Re-fetch list to get updated v2 fields (meal_count, generated_at)
    const { data: updatedList } = await admin
      .from("grocery_lists")
      .select("*")
      .eq("id", list.id)
      .single();

    return NextResponse.json({ list: updatedList ?? list, items: finalItems });
  } catch (error) {
    console.error("Grocery list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate grocery list" },
      { status: 500 }
    );
  }
}
