import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeekStart } from "@/lib/gamification";

// Last week's cooking recap (the ISO week that just finished): the distinct recipes
// confirmed cooked, how many cooks total, and tomatoes earned that week.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const thisMonday = getWeekStart();
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);
  const startStr = lastMonday.toISOString().slice(0, 10);
  const endStr = thisMonday.toISOString().slice(0, 10); // exclusive upper bound

  type RecipeRel = { id: string; title: string; image_url: string | null } | null;
  let recipes: { id: string; title: string; image_url: string | null; times: number }[] = [];

  try {
    const { data: confs } = await admin
      .from("cooked_confirmations")
      .select("recipe_id, cooked_date, recipes(id, title, image_url)")
      .eq("user_id", user.id)
      .gte("cooked_date", startStr)
      .lt("cooked_date", endStr)
      .order("cooked_date", { ascending: true });

    const map = new Map<string, { id: string; title: string; image_url: string | null; times: number }>();
    for (const c of (confs ?? []) as unknown as { recipe_id: string; recipes: RecipeRel | RecipeRel[] }[]) {
      const r = Array.isArray(c.recipes) ? c.recipes[0] : c.recipes;
      if (!r) continue;
      const existing = map.get(c.recipe_id);
      if (existing) existing.times += 1;
      else map.set(c.recipe_id, { id: r.id, title: r.title, image_url: r.image_url, times: 1 });
    }
    recipes = [...map.values()];
  } catch {
    // cooked_confirmations not migrated yet
    recipes = [];
  }

  const { data: txns } = await admin
    .from("tomato_transactions")
    .select("amount")
    .eq("user_id", user.id)
    .gt("amount", 0)
    .gte("created_at", lastMonday.toISOString())
    .lt("created_at", thisMonday.toISOString());
  const tomatoesEarned = (txns ?? []).reduce((s, t) => s + (t.amount || 0), 0);

  const totalCooks = recipes.reduce((s, r) => s + r.times, 0);

  return NextResponse.json({
    weekStart: startStr,
    weekEnd: endStr,
    recipes,
    distinctCount: recipes.length,
    totalCooks,
    tomatoesEarned,
  });
}
