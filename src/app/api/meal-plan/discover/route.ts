import { NextResponse } from "next/server";
import { discoverRecipes } from "@/lib/claude";
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
    const { pantryItems } = await request.json();
    const recipes = await discoverRecipes(pantryItems);

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error("Recipe discovery error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to discover recipes",
      },
      { status: 500 }
    );
  }
}
