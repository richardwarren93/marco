import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { promptRecipes } from "@/lib/claude";
import type { PantryItem, Recipe } from "@/types";

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
    const { prompt, context } = body as {
      prompt: string;
      context: "all" | "my_kitchen";
    };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let kitchenContext:
      | {
          pantryItems?: PantryItem[];
          equipment?: string[];
          recipes?: Recipe[];
        }
      | undefined;

    if (context === "my_kitchen") {
      const [pantryRes, equipmentRes, recipesRes] = await Promise.all([
        supabase.from("pantry_items").select("*"),
        supabase
          .from("user_equipment")
          .select("equipment_name")
          .eq("user_id", user.id),
        supabase
          .from("recipes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      kitchenContext = {
        pantryItems: (pantryRes.data as PantryItem[]) || [],
        equipment:
          equipmentRes.data?.map((e) => e.equipment_name) || [],
        recipes: (recipesRes.data as Recipe[]) || [],
      };
    }

    const results = await promptRecipes(prompt, context, kitchenContext);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Prompt recipes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
