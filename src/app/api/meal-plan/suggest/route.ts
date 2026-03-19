import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSuggestions } from "@/lib/claude";
import type { PlanSources } from "@/components/meal-plan/RecipePromptInput";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prompt, sources } = (await request.json()) as {
      prompt: string;
      sources: PlanSources;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Build kitchen context based on selected sources — no DB writes
    const kitchenContext: {
      pantryItems?: { name: string }[];
      recipes?: { id: string; title: string }[];
    } = {};

    if (sources.savedRecipes) {
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id, title")
        .order("created_at", { ascending: false })
        .limit(30);
      kitchenContext.recipes = recipes || [];
    }

    if (sources.pantry) {
      const { data: pantryItems } = await supabase
        .from("pantry_items")
        .select("name")
        .limit(50);
      kitchenContext.pantryItems = pantryItems || [];
    }

    const suggestions = await generateSuggestions(prompt, sources, kitchenContext);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggest route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
