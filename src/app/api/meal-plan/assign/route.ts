import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipeId, draftNotes, slots, replace } = (await request.json()) as {
      recipeId?: string | null;
      draftNotes?: string | null;
      slots: { date: string; mealType: string }[];
      replace: boolean;
    };

    if (!slots?.length) {
      return NextResponse.json({ error: "slots is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const insertedIds: string[] = [];

    for (const slot of slots) {
      if (replace) {
        // Remove any existing user-owned plan for this slot before inserting
        await admin
          .from("meal_plans")
          .delete()
          .eq("user_id", user.id)
          .eq("planned_date", slot.date)
          .eq("meal_type", slot.mealType);
      }

      const { data: plan, error } = await admin
        .from("meal_plans")
        .insert({
          user_id: user.id,
          recipe_id: recipeId || null,
          planned_date: slot.date,
          meal_type: slot.mealType,
          notes: !recipeId && draftNotes ? draftNotes : null,
        })
        .select("id")
        .single();

      if (!error && plan) {
        insertedIds.push(plan.id);
      } else if (error) {
        console.error("Insert slot error:", error);
      }
    }

    return NextResponse.json({ planIds: insertedIds, count: insertedIds.length });
  } catch (error) {
    console.error("Assign meal plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
