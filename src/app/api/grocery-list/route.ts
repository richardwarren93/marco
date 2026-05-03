import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateIngredients } from "@/lib/groceryAggregator";
import { getCanonicalListUserId } from "@/lib/grocery-household";
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

  // Canonical list owner: either this user (solo) or the household creator.
  // All household members read/write to that one list.
  const canonicalUserId = await getCanonicalListUserId(admin, user.id);

  // ── Parallel batch 1: grocery list + household membership ─────────────────
  const [listRes, membershipRes] = await Promise.all([
    admin.from("grocery_lists").select("*").eq("user_id", canonicalUserId).eq("week_start", dateStart).maybeSingle(),
    admin.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const list = listRes.data;
  const membership = membershipRes.data;

  // Resolve all household user IDs + profiles (still needed for the meal cards
  // to show "from Elayne" badges — meals stay per-user even though the
  // grocery list is shared).
  const allUserIds = [user.id];
  const profileMap = new Map<string, string>();

  if (membership) {
    // Step 1: Get all user IDs in the household (no join — reliable)
    const { data: allMembers } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", membership.household_id);

    if (allMembers) {
      for (const m of allMembers) {
        if (!allUserIds.includes(m.user_id)) allUserIds.push(m.user_id);
      }

      // Step 2: Get display names for household members (separate query)
      const otherIds = allUserIds.filter(id => id !== user.id);
      if (otherIds.length > 0) {
        const { data: profiles } = await admin
          .from("user_profiles")
          .select("id, display_name")
          .in("id", otherIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap.set(p.id, p.display_name || "Housemate");
          }
        }
      }
    }
  }

  // ── Parallel batch 2: items + meals + change detection ────────────────────
  const itemsPromise = list ? fetchItems(admin, list.id) : Promise.resolve([]);

  const mealsPromise = admin
    .from("meal_plans")
    .select("id, user_id, planned_date, meal_type, servings, recipe:recipes(id, title, image_url, prep_time_minutes, cook_time_minutes)")
    .in("user_id", allUserIds)
    .gte("planned_date", dateStart)
    .lte("planned_date", dateEnd)
    .not("recipe_id", "is", null)
    .order("planned_date", { ascending: true });

  const changePromise = (list?.generated_at)
    ? admin.from("meal_plans").select("created_at").in("user_id", allUserIds)
        .gte("planned_date", dateStart).lte("planned_date", dateEnd)
        .gt("created_at", list.generated_at).limit(1).maybeSingle()
    : Promise.resolve({ data: null });

  const [ownItems, mealsRes, changeRes] = await Promise.all([
    itemsPromise, mealsPromise, changePromise,
  ]);

  // Detect changes: new meals added OR meals deleted (count mismatch)
  const currentMealCount = (mealsRes.data ?? []).length;
  const meal_plan_changed = !!changeRes.data || (list?.meal_count != null && currentMealCount !== list.meal_count);

  // Annotate meals with owner info (used for the meal cards at top of grocery)
  const meals = (mealsRes.data ?? []).map((m: any) => ({
    ...m,
    is_household: m.user_id !== user.id,
    owner_name: m.user_id !== user.id ? (profileMap.get(m.user_id) || "Housemate") : null,
  }));

  return NextResponse.json({
    list,
    items: ownItems,
    householdItems: [], // Deprecated: list is now shared at canonical owner; kept for client compat
    householdMembers: [...profileMap.entries()].map(([user_id, display_name]) => ({ user_id, display_name })),
    meal_plan_changed,
    meals,
  });
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

    // Canonical list owner — household creator if in a household, else self.
    // This is the user_id we write the grocery_lists row under, so all
    // household members read/write the same shared list.
    const canonicalUserId = await getCanonicalListUserId(admin, user.id);

    // ── Resolve household member IDs (if any) ────────────────────────────────
    const planUserIds = [user.id];
    const { data: membership } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .maybeSingle();

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
      // No meals for this week. If a list already exists, its derived items
      // are stale (e.g. the user just removed the last meal). Clear them so
      // the grocery view stays in sync. Custom items are preserved. If no
      // list exists yet, nothing to do — surface an error so the UI knows.
      const { data: existingList } = await admin
        .from("grocery_lists")
        .select("*")
        .eq("user_id", canonicalUserId)
        .eq("week_start", dateStart)
        .maybeSingle();

      if (!existingList) {
        return NextResponse.json({ error: "No meals planned for this range" }, { status: 400 });
      }

      await admin
        .from("grocery_items")
        .delete()
        .eq("list_id", existingList.id)
        .eq("is_custom", false);

      await admin
        .from("grocery_lists")
        .update({ generated_at: new Date().toISOString(), meal_count: 0 })
        .eq("id", existingList.id)
        .then(() => {}, () => {});

      const finalItems = await fetchItems(admin, existingList.id);
      const { data: updatedList } = await admin
        .from("grocery_lists")
        .select("*")
        .eq("id", existingList.id)
        .single();

      return NextResponse.json({ list: updatedList ?? existingList, items: finalItems });
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
    // (safe even if v2 migration hasn't been run). Use the canonical owner so
    // household members all upsert into the same row.
    const { data: list, error: listError } = await admin
      .from("grocery_lists")
      .upsert(
        { user_id: canonicalUserId, week_start: dateStart, updated_at: new Date().toISOString() },
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

    // When user explicitly regenerates, don't carry over soft-deleted state —
    // they want a fresh list. Only preserve checked state and user overrides.
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
          soft_deleted: false,
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
