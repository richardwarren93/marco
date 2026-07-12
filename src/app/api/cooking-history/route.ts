import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeekStart } from "@/lib/gamification";

// Full cooking history, grouped by ISO week (Monday-start, UTC — same convention
// as getWeekStart). Sourced from cooked_confirmations (the earn-once "I cooked
// this" ledger), joined to recipes; each week also carries the tomatoes earned
// in that window. Newest week first, current week included, up to 26 weeks.
// This powers /profile/history and is the shape a monthly recap can roll up.

const HISTORY_WEEKS = 26;

/** Monday (YYYY-MM-DD, UTC) of the week containing the given YYYY-MM-DD date. */
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + "T00:00:00Z");
  const day = d.getUTCDay(); // 0=Sun, 1=Mon…
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

interface WeekEntry {
  weekStart: string;
  recipes: { id: string; title: string; image_url: string | null; times: number }[];
  totalCooks: number;
  tomatoesEarned: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const thisMonday = getWeekStart();
  const lowerBound = new Date(thisMonday);
  lowerBound.setUTCDate(lowerBound.getUTCDate() - 7 * (HISTORY_WEEKS - 1));
  const lowerStr = lowerBound.toISOString().slice(0, 10);

  type RecipeRel = { id: string; title: string; image_url: string | null } | null;

  // Confirmations + recipe metadata (degrades to empty if the table isn't migrated).
  const { data: confs } = await admin
    .from("cooked_confirmations")
    .select("recipe_id, cooked_date, recipes(id, title, image_url)")
    .eq("user_id", user.id)
    .gte("cooked_date", lowerStr)
    .order("cooked_date", { ascending: false });

  // Group cooks into weeks, deduping recipes within a week (×N counts).
  const weekMap = new Map<string, { recipes: Map<string, WeekEntry["recipes"][number]>; totalCooks: number }>();
  for (const c of ((confs ?? []) as unknown as { recipe_id: string; cooked_date: string; recipes: RecipeRel | RecipeRel[] }[])) {
    const r = Array.isArray(c.recipes) ? c.recipes[0] : c.recipes;
    if (!r) continue;
    const wk = mondayOf(c.cooked_date);
    let bucket = weekMap.get(wk);
    if (!bucket) {
      bucket = { recipes: new Map(), totalCooks: 0 };
      weekMap.set(wk, bucket);
    }
    bucket.totalCooks += 1;
    const existing = bucket.recipes.get(c.recipe_id);
    if (existing) existing.times += 1;
    else bucket.recipes.set(c.recipe_id, { id: r.id, title: r.title, image_url: r.image_url, times: 1 });
  }

  // Tomatoes earned per week (all positive earns, matching the old weekly recap).
  const { data: txns } = await admin
    .from("tomato_transactions")
    .select("amount, created_at")
    .eq("user_id", user.id)
    .gt("amount", 0)
    .gte("created_at", lowerBound.toISOString());

  const tomatoByWeek = new Map<string, number>();
  for (const t of txns ?? []) {
    const wk = mondayOf(new Date(t.created_at).toISOString());
    tomatoByWeek.set(wk, (tomatoByWeek.get(wk) ?? 0) + (t.amount || 0));
  }

  const weeks: WeekEntry[] = [...weekMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, bucket]) => ({
      weekStart,
      recipes: [...bucket.recipes.values()],
      totalCooks: bucket.totalCooks,
      tomatoesEarned: tomatoByWeek.get(weekStart) ?? 0,
    }));

  return NextResponse.json({ weeks, currentWeekStart: thisMonday.toISOString().slice(0, 10) });
}
