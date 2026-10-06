import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Onboarding's "When are you cooking it?" — puts a recipe (the one you just
// saved, by default) on your plan for a given LOCAL date. The grocery list is
// derived from the plan, so this is also what fills Groceries.
//
// GET  → the recipe the step should ask about (your most recent save)
// POST { date: "YYYY-MM-DD", recipeId?: string } → { title, image_url, ingredientCount }

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await sb.from("recipes").select("id,title,image_url").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ recipe: data ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({} as { date?: string; recipeId?: string }));
  if (typeof body.date !== "string" || !DATE_RX.test(body.date)) return NextResponse.json({ error: "Pick a day to cook it." }, { status: 400 });

  let q = sb.from("recipes").select("id,title,image_url,ingredients").eq("user_id", user.id);
  q = typeof body.recipeId === "string" ? q.eq("id", body.recipeId) : q.order("created_at", { ascending: false }).limit(1);
  const { data: recipe } = await q.maybeSingle();
  if (!recipe) return NextResponse.json({ error: "Save a recipe first." }, { status: 404 });

  // Idempotent: a retry or double tap never stacks the same dinner twice.
  const { data: existing } = await sb.from("meal_plans").select("id").eq("user_id", user.id).eq("recipe_id", recipe.id).eq("planned_date", body.date).limit(1).maybeSingle();
  if (!existing) {
    const { error } = await sb.from("meal_plans").insert({ user_id: user.id, recipe_id: recipe.id, planned_date: body.date, meal_type: "dinner", servings: 1, notes: null });
    if (error) return NextResponse.json({ error: "That didn't make it onto your plan. Try again." }, { status: 503 });
  }

  const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
  return NextResponse.json({ title: recipe.title, image_url: recipe.image_url, ingredientCount });
}
