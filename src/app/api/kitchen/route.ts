import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { peopleCount } from "@/lib/people";

// My Kitchen, in three parts:
//   tonight — what's planned for today (or the next planned meal)
//   feed    — ONE newest-first stream of everything landing in your kitchen:
//             your saves, your household's, and saves from your tables
//   ranked  — what you've cooked: Beli-ranked cooks first, then unranked ones
// ?today=YYYY-MM-DD is the viewer's LOCAL date (the server can't know it).

type FeedItem = { key: string; source: "you" | "household" | "table"; title: string; image: string | null; by: string | null; href: string | null; at: string };
type RankedItem = { key: string; title: string; image: string | null; score: number | null; sentiment: string | null; href: string | null };
type Rec = { title: string | null; image_url: string | null };
type PlanRow = { planned_date: string; meal_type: string | null; recipe_id: string; recipes: Rec | Rec[] | null };

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
function one<T>(v: T | T[] | null | undefined): T | null { return Array.isArray(v) ? v[0] ?? null : v ?? null; }

export async function GET(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to open your kitchen." }, { status: 401 });
  const today = new URL(request.url).searchParams.get("today");

  const [profile, recipes, cooks, saved] = await Promise.all([
    sb.from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    sb.from("recipes").select("id,title,image_url,created_at", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    sb.from("cooks").select("id,title,photo_url,source_recipe_id,created_at", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    sb.from("saves").select("created_at, cook:cooks(id,title,photo_url,source_recipe_id,author_name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
  ]);
  if ([profile, recipes, cooks, saved].some((r) => r.error)) return NextResponse.json({ error: "Your kitchen could not be loaded. Please retry." }, { status: 503 });

  const admin = createAdminClient();

  // Your household's recent additions (admin: household cross-reads aren't in RLS).
  const household: FeedItem[] = [];
  let peers: string[] = [];
  try {
    const { data: membership } = await admin.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();
    if (membership) {
      const { data: members } = await admin.from("household_members").select("user_id").eq("household_id", membership.household_id).neq("user_id", user.id);
      const ids = (members ?? []).map((m: { user_id: string }) => m.user_id);
      peers = ids;
      if (ids.length) {
        const [hr, profs] = await Promise.all([
          admin.from("recipes").select("id,title,image_url,user_id,created_at").in("user_id", ids).order("created_at", { ascending: false }).limit(12),
          admin.from("user_profiles").select("user_id,display_name").in("user_id", ids),
        ]);
        const names = new Map((profs.data ?? []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, p.display_name]));
        for (const r of (hr.data ?? []) as { id: string; title: string | null; image_url: string | null; user_id: string; created_at: string }[]) {
          household.push({ key: `h-${r.id}`, source: "household", title: r.title || "A recipe", image: r.image_url, by: (names.get(r.user_id) as string) || "your housemate", href: `/recipes/${r.id}`, at: r.created_at });
        }
      }
    }
  } catch { /* the feed still works without household items */ }

  // ── feed: one stream, newest first ──────────────────────────────────────────
  const ownRows = (recipes.data ?? []) as { id: string; title: string | null; image_url: string | null; created_at: string }[];
  const mine: FeedItem[] = ownRows.map((r) => ({ key: `r-${r.id}`, source: "you", title: r.title || "A recipe", image: r.image_url, by: null, href: `/recipes/${r.id}`, at: r.created_at }));
  type SavedCook = { id: string; title: string | null; photo_url: string | null; source_recipe_id: string | null; author_name: string | null };
  const fromTables: FeedItem[] = [];
  for (const s of (saved.data ?? []) as unknown as { created_at: string; cook: SavedCook | SavedCook[] | null }[]) {
    const c = one(s.cook);
    if (c) fromTables.push({ key: `s-${c.id}`, source: "table", title: c.title || "A cook", image: c.photo_url, by: c.author_name, href: c.source_recipe_id ? `/recipes/${c.source_recipe_id}` : null, at: s.created_at });
  }
  const seen = new Set<string>();
  const feed = [...mine, ...household, ...fromTables]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .filter((f) => { const k = f.href ?? f.key; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 12);

  // ── tonight (or the next planned meal) ─────────────────────────────────────
  // The household shares one meal plan, so a housemate's dinner counts too
  // (yours first when you both planned one). Admin: housemates' plans and
  // recipes aren't readable under RLS; scoped to you + your household only.
  let tonight: { title: string; image: string | null; href: string } | null = null;
  let next: { title: string; date: string; href: string } | null = null;
  if (today && DATE_RX.test(today)) {
    const { data: plans } = await admin.from("meal_plans").select("user_id,planned_date,meal_type,recipe_id,recipes(title,image_url)").in("user_id", [user.id, ...peers]).gte("planned_date", today).order("planned_date", { ascending: true }).limit(16);
    const rows = ((plans ?? []) as unknown as (PlanRow & { user_id: string })[]).filter((p) => p.recipe_id)
      .sort((a, b) => a.planned_date.localeCompare(b.planned_date) || Number(b.user_id === user.id) - Number(a.user_id === user.id));
    const todays = rows.filter((p) => p.planned_date === today);
    const pick = todays.find((p) => p.meal_type === "dinner" && p.user_id === user.id) ?? todays.find((p) => p.meal_type === "dinner") ?? todays[0];
    if (pick) {
      const rec = one(pick.recipes);
      tonight = { title: rec?.title || "Tonight's dinner", image: rec?.image_url ?? null, href: `/recipes/${pick.recipe_id}` };
    } else {
      const up = rows.find((p) => p.planned_date > today);
      if (up) next = { title: one(up.recipes)?.title || "A recipe", date: up.planned_date, href: `/recipes/${up.recipe_id}` };
    }
  }

  // ── ranked: Beli scores first, then cooks you haven't ranked yet ───────────
  const ranked: RankedItem[] = [];
  const rankedRecipes = new Set<string>();
  try {
    const { data } = await admin.from("cook_ratings").select("recipe_id,score,sentiment,recipes(title,image_url)").eq("user_id", user.id).order("score", { ascending: false }).limit(10);
    for (const r of (data ?? []) as unknown as { recipe_id: string; score: number; sentiment: string; recipes: Rec | Rec[] | null }[]) {
      const rec = one(r.recipes);
      rankedRecipes.add(r.recipe_id);
      ranked.push({ key: `rk-${r.recipe_id}`, title: rec?.title || "A dish", image: rec?.image_url ?? null, score: r.score, sentiment: r.sentiment, href: `/recipes/${r.recipe_id}` });
    }
  } catch { /* ratings table may be missing — unranked cooks still show */ }
  const unrankedSeen = new Set<string>();
  for (const c of (cooks.data ?? []) as { id: string; title: string | null; photo_url: string | null; source_recipe_id: string | null }[]) {
    const k = c.source_recipe_id ?? c.id;
    if ((c.source_recipe_id && rankedRecipes.has(c.source_recipe_id)) || unrankedSeen.has(k)) continue;
    unrankedSeen.add(k);
    ranked.push({ key: `ck-${c.id}`, title: c.title || "Your cook", image: c.photo_url, score: null, sentiment: null, href: c.source_recipe_id ? `/recipes/${c.source_recipe_id}` : null });
  }

  let people = 0;
  try { people = await peopleCount(admin, user.id); } catch { people = 0; }

  return NextResponse.json({
    name: profile.data?.display_name || user.email?.split("@")[0] || "You",
    recipeCount: recipes.count ?? 0,
    cookCount: cooks.count ?? 0,
    feed, tonight, next, ranked: ranked.slice(0, 12),
    peopleCount: people,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
