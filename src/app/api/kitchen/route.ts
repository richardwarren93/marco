import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to open your kitchen." }, { status: 401 });
  const [profile, recipes, cooks, saved] = await Promise.all([
    sb.from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    sb.from("recipes").select("id,title,image_url", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
    sb.from("cooks").select("id,title,photo_url,source_recipe_id", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
    sb.from("saves").select("cook:cooks(id,title,photo_url,source_recipe_id,author_name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
  ]);
  if ([profile, recipes, cooks, saved].some(r => r.error)) return NextResponse.json({ error: "Your kitchen could not be loaded. Please retry." }, { status: 503 });

  // What your household has been adding — your shared kitchen, newest first,
  // tagged with who added each. Uses admin (household cross-reads aren't in RLS).
  let householdRecipes: { id: string; title: string | null; image_url: string | null; author_name: string; created_at: string }[] = [];
  try {
    const admin = createAdminClient();
    const { data: membership } = await admin.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();
    if (membership) {
      const { data: members } = await admin.from("household_members").select("user_id").eq("household_id", membership.household_id).neq("user_id", user.id);
      const ids = (members ?? []).map((m: { user_id: string }) => m.user_id);
      if (ids.length) {
        const [hr, profs] = await Promise.all([
          admin.from("recipes").select("id,title,image_url,user_id,created_at").in("user_id", ids).order("created_at", { ascending: false }).limit(6),
          admin.from("user_profiles").select("user_id,display_name").in("user_id", ids),
        ]);
        const nameMap = new Map((profs.data ?? []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, p.display_name]));
        householdRecipes = (hr.data ?? []).map((r: { id: string; title: string | null; image_url: string | null; user_id: string; created_at: string }) => ({ id: r.id, title: r.title, image_url: r.image_url, author_name: (nameMap.get(r.user_id) as string) || "housemate", created_at: r.created_at }));
      }
    }
  } catch { householdRecipes = []; }

  // Your top cooks — the Beli-style ranked list, highest score first.
  let topCooks: { recipe_id: string; title: string | null; image_url: string | null; score: number; sentiment: string }[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("cook_ratings").select("recipe_id,score,sentiment,recipes(title,image_url)").eq("user_id", user.id).order("score", { ascending: false }).limit(5);
    type Rec = { title: string | null; image_url: string | null };
    topCooks = ((data ?? []) as unknown as { recipe_id: string; score: number; sentiment: string; recipes: Rec | Rec[] | null }[]).map((r) => {
      const rec = Array.isArray(r.recipes) ? r.recipes[0] : r.recipes;
      return { recipe_id: r.recipe_id, title: rec?.title ?? "A dish", image_url: rec?.image_url ?? null, score: r.score, sentiment: r.sentiment };
    });
  } catch { topCooks = []; }

  return NextResponse.json({
    name: profile.data?.display_name || user.email?.split("@")[0] || "You",
    recipes: recipes.data ?? [], recipeCount: recipes.count ?? 0,
    cooks: cooks.data ?? [], cookCount: cooks.count ?? 0,
    saved: (saved.data ?? []).map(s => s.cook).filter(Boolean),
    householdRecipes, topCooks,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
