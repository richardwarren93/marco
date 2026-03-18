import { NextResponse } from "next/server";
import { suggestMeals } from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pantryItems, recipes } = await request.json();
    const suggestions = await suggestMeals(pantryItems, recipes);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Meal suggestion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate suggestions",
      },
      { status: 500 }
    );
  }
}
