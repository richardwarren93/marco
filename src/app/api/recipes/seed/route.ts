import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Seed a single curated starter recipe into an EMPTY kitchen, so the guide's
// "save a recipe" / "cook a recipe" steps always have real content to work
// with (and a new user's kitchen never looks barren). No-op once any recipe
// exists, so it can be called freely.

const STARTER = {
  title: "Mapo Tofu",
  description: "Silken tofu in a numbing, chili-bean sauce — fast, cheap, and deeply savory. A good first cook.",
  ingredients: [
    { name: "silken or soft tofu", amount: "400", unit: "g" },
    { name: "ground pork (or minced mushrooms)", amount: "150", unit: "g" },
    { name: "doubanjiang (chili bean paste)", amount: "2", unit: "tbsp" },
    { name: "garlic, minced", amount: "3", unit: "cloves" },
    { name: "ginger, minced", amount: "1", unit: "tbsp" },
    { name: "Sichuan peppercorns, ground", amount: "1", unit: "tsp" },
    { name: "soy sauce", amount: "1", unit: "tbsp" },
    { name: "cornstarch", amount: "1", unit: "tbsp" },
    { name: "scallions, sliced", amount: "2", unit: "" },
    { name: "neutral oil", amount: "2", unit: "tbsp" },
  ],
  steps: [
    "Cut the tofu into 2cm cubes and slide them into a bowl of warm, lightly salted water while you cook — this keeps them from breaking.",
    "Heat the oil in a wok or skillet over medium-high. Brown the pork, breaking it up, until crisp at the edges, about 4 minutes.",
    "Push the pork aside, add the doubanjiang and fry 30 seconds until the oil turns red, then stir in the garlic and ginger for another 30 seconds.",
    "Pour in 3/4 cup water and the soy sauce and bring to a simmer.",
    "Drain the tofu and gently fold it in. Simmer 3–4 minutes, basting rather than stirring so the cubes stay whole.",
    "Stir the cornstarch with 2 tbsp cold water, swirl it in, and cook 1 minute until glossy and thickened.",
    "Off the heat, scatter over the ground Sichuan peppercorns and scallions. Serve over rice.",
  ],
  servings: 3,
  prep_time_minutes: 10,
  cook_time_minutes: 15,
  tags: ["dinner", "quick", "spicy"],
  meal_type: "dinner" as const,
  image_url: "/onboarding/recipes/mapo-tofu.jpg",
  notes: "A starter from Marco 🍅 — swap the pork for minced mushrooms to keep it veggie.",
};

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Only seed an empty kitchen.
  const { count } = await admin.from("recipes").select("id", { head: true, count: "exact" }).eq("user_id", user.id);
  if ((count ?? 0) > 0) return NextResponse.json({ seeded: false });

  const { data, error } = await admin.from("recipes").insert({ user_id: user.id, ...STARTER }).select("id, title").single();
  if (error) return NextResponse.json({ error: "Could not seed a starter recipe." }, { status: 500 });

  try { await admin.from("activity_feed").insert({ user_id: user.id, activity_type: "saved_recipe", recipe_id: data.id }); } catch { /* non-critical */ }

  return NextResponse.json({ seeded: true, recipe: data });
}
