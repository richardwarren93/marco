import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/recipes/lineage-counts  { ids: string[] }
 * → { counts: { [recipeId]: number } }
 * The true number of cooks in each recipe's lineage, for the count stamp on
 * feed cards. Admin-backed so the count reflects everyone who cooked it, not
 * just cooks visible at the viewer's table. Best-effort.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { ids } = await request.json();
    const recipeIds = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string").slice(0, 100);
    if (recipeIds.length === 0) return NextResponse.json({ counts: {} });

    const admin = createAdminClient();
    const { data } = await admin
      .from("cooks")
      .select("source_recipe_id")
      .in("source_recipe_id", recipeIds);

    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as { source_recipe_id: string | null }[]) {
      if (row.source_recipe_id) counts[row.source_recipe_id] = (counts[row.source_recipe_id] ?? 0) + 1;
    }
    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ counts: {} });
  }
}
