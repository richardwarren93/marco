import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateIngredients } from "@/lib/groceryAggregator";
import type { Ingredient, PantryItem, Recipe } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get("week_start");
  if (!weekStart) {
    return NextResponse.json({ error: "week_start required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the grocery list for this week
  const { data: list } = await admin
    .from("grocery_lists")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  let ownItems: any[] = [];
  if (list) {
    const { data: items } = await admin
      .from("grocery_items")
      .select("*")
      .eq("list_id", list.id)
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    ownItems = items || [];
  }

  // Check for household members' lists
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  let householdItems: any[] = [];
  let householdMembers: any[] = [];

  if (membership) {
    // Get all household members (excluding self)
    const { data: members } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", membership.household_id)
      .neq("user_id", user.id);

    if (members && members.length > 0) {
      const memberIds = members.map((m: any) => m.user_id);

      // Get profiles for household members
      const { data: profiles } = await admin
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", memberIds);

      householdMembers = profiles || [];

      // Fetch their grocery lists for the same week
      const { data: memberLists } = await admin
        .from("grocery_lists")
        .select("*")
        .in("user_id", memberIds)
        .eq("week_start", weekStart);

      if (memberLists && memberLists.length > 0) {
        const listIds = memberLists.map((l: any) => l.id);
        const { data: memberItems } = await admin
          .from("grocery_items")
          .select("*")
          .in("list_id", listIds)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        // Tag each item with the owner's name
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
        const listOwnerMap = new Map(memberLists.map((l: any) => [l.id, l.user_id]));

        householdItems = (memberItems || []).map((item: any) => ({
          ...item,
          owner_name: profileMap.get(listOwnerMap.get(item.list_id)) || "Housemate",
        }));
      }
    }
  }

  return NextResponse.json({
    list,
    items: ownItems,
    householdItems,
    householdMembers,
  });
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
    const { week_start } = body;

    if (!week_start) {
      return NextResponse.json({ error: "week_start required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Calculate week end (7 days after start)
    const startDate = new Date(week_start + "T00:00:00");
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEnd = endDate.toISOString().split("T")[0];

    // Fetch all meal plans for this week with recipes
    const { data: plans } = await admin
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .eq("user_id", user.id)
      .gte("planned_date", week_start)
      .lte("planned_date", weekEnd)
      .not("recipe_id", "is", null);

    if (!plans || plans.length === 0) {
      return NextResponse.json({ error: "No meals planned for this week" }, { status: 400 });
    }

    // Fetch pantry items
    const { data: pantryItems } = await admin
      .from("pantry_items")
      .select("*")
      .eq("user_id", user.id);

    // Aggregate ingredients across all planned recipes
    const recipeIngredients = plans
      .filter((p) => p.recipe)
      .map((p) => ({
        recipeTitle: (p.recipe as Recipe).title,
        ingredients: (p.recipe as Recipe).ingredients as Ingredient[],
      }));

    const aggregated = aggregateIngredients(
      recipeIngredients,
      (pantryItems as PantryItem[]) || []
    );

    // Upsert grocery list
    const { data: list, error: listError } = await admin
      .from("grocery_lists")
      .upsert(
        {
          user_id: user.id,
          week_start,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();

    if (listError || !list) {
      throw listError || new Error("Failed to create grocery list");
    }

    // Delete old items for this list (regenerate)
    await admin.from("grocery_items").delete().eq("list_id", list.id);

    // Insert new aggregated items
    if (aggregated.length > 0) {
      const items = aggregated.map((item) => ({
        list_id: list.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        recipe_sources: item.recipeSources,
        checked: false,
        is_custom: false,
        in_pantry: item.inPantry,
      }));

      const { error: insertError } = await admin.from("grocery_items").insert(items);
      if (insertError) throw insertError;
    }

    // Fetch the complete list
    const { data: finalItems } = await admin
      .from("grocery_items")
      .select("*")
      .eq("list_id", list.id)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    return NextResponse.json({ list, items: finalItems || [] });
  } catch (error) {
    console.error("Grocery list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate grocery list" },
      { status: 500 }
    );
  }
}
