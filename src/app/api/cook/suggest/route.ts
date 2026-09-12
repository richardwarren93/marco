import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSuggestion } from "@/lib/cook-engine-db";
import type { CookContext } from "@/lib/cook-engine";

// POST /api/cook/suggest — tonight's ONE suggestion (+ backup + reasoning).
// Body: { timeBudget?, energy?, ingredientMode?, mealType? } from the check-in.
// Allergens + dietary constraints are loaded server-side (never trust the client
// for hard filters).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase.from("user_preferences").select("allergies").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_profiles").select("dietary_filters").eq("user_id", user.id).maybeSingle(),
  ]);

  const ctx: CookContext = {
    timeBudget: body.timeBudget ?? "medium",
    energy: body.energy ?? "medium",
    ingredientMode: body.ingredientMode ?? "either",
    mealType: body.mealType ?? "dinner",
    dayOfWeek: new Date().getDay(),
    allergens: prefs?.allergies ?? [],
    dietary: (profile as { dietary_filters?: string[] } | null)?.dietary_filters ?? [],
  };

  const rec = await getSuggestion(supabase, user.id, ctx);
  if (!rec) return NextResponse.json({ context: ctx, primary: null, backup: null, reasoning: "" });

  // Hydrate display fields (image, description, time) for the two picks.
  const ids = [rec.primary.id, rec.backup?.id].filter(Boolean) as string[];
  const { data: rows } = await supabase
    .from("catalog_recipes")
    .select("id,title,description,image_url,total_time_minutes,difficulty,cuisine,meal_type,servings,ingredients,steps")
    .in("id", ids);
  const byId = Object.fromEntries((rows ?? []).map((r: { id: string }) => [r.id, r]));

  return NextResponse.json({
    context: ctx,
    reasoning: rec.reasoning,
    primary: byId[rec.primary.id] ?? null,
    backup: rec.backup ? byId[rec.backup.id] ?? null : null,
  });
}
