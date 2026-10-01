import { createClient } from "@/lib/supabase/server";
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
  return NextResponse.json({ name: profile.data?.display_name || user.email?.split("@")[0] || "You", recipes: recipes.data ?? [], recipeCount: recipes.count ?? 0, cooks: cooks.data ?? [], cookCount: cooks.count ?? 0, saved: (saved.data ?? []).map(s => s.cook).filter(Boolean) }, { headers: { "Cache-Control": "private, no-store" } });
}
