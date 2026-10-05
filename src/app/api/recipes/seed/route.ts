import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Curated starter recipes the guide's "Surprise me 🎰" lottery can land on, so
// a new cook always has something real to save or cook. POST { slug } seeds that
// one (random when omitted/unknown), deduped by title so repeat spins don't pile
// up copies. Explicit, user-chosen — never silent.

type Starter = {
  slug: string;
  title: string;
  image_url: string;
  description: string;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: string[];
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  tags: string[];
};

const STARTERS: Starter[] = [
  {
    slug: "mapo-tofu",
    title: "Mapo Tofu",
    image_url: "/onboarding/recipes/mapo-tofu.jpg",
    description: "Silken tofu in a numbing, chili-bean sauce — fast, cheap, and deeply savory.",
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
      "Cut the tofu into 2cm cubes and slide them into warm, lightly salted water while you cook so they don't break.",
      "Heat the oil over medium-high and brown the pork, breaking it up, until crisp at the edges, ~4 min.",
      "Push the pork aside, fry the doubanjiang 30 sec until the oil reddens, then add garlic and ginger for 30 sec.",
      "Pour in 3/4 cup water and the soy sauce and bring to a simmer.",
      "Drain the tofu and fold it in gently; simmer 3–4 min, basting rather than stirring.",
      "Stir the cornstarch with 2 tbsp cold water, swirl it in, and cook 1 min until glossy.",
      "Off the heat, scatter over the Sichuan pepper and scallions. Serve over rice.",
    ],
    servings: 3, prep_time_minutes: 10, cook_time_minutes: 15, tags: ["dinner", "quick", "spicy"],
  },
  {
    slug: "shrimp-scampi",
    title: "Shrimp Scampi",
    image_url: "/onboarding/recipes/shrimp scampi.jpg",
    description: "Garlicky, lemony shrimp and linguine in a glossy butter-wine sauce. On the table in 20.",
    ingredients: [
      { name: "linguine", amount: "300", unit: "g" },
      { name: "large shrimp, peeled", amount: "450", unit: "g" },
      { name: "butter", amount: "3", unit: "tbsp" },
      { name: "olive oil", amount: "2", unit: "tbsp" },
      { name: "garlic, minced", amount: "4", unit: "cloves" },
      { name: "red pepper flakes", amount: "0.5", unit: "tsp" },
      { name: "dry white wine", amount: "0.5", unit: "cup" },
      { name: "lemon (juice + zest)", amount: "1", unit: "" },
      { name: "parsley, chopped", amount: "0.25", unit: "cup" },
    ],
    steps: [
      "Boil the linguine in well-salted water until al dente; reserve 1/2 cup pasta water, then drain.",
      "Pat the shrimp dry and season. Heat the oil + 1 tbsp butter and sear 1 min per side until just pink; remove.",
      "Add the garlic and pepper flakes to the pan for 30 sec, then pour in the wine and simmer 2 min.",
      "Stir in the lemon juice, zest, and remaining butter until silky.",
      "Return the shrimp and pasta, tossing with splashes of pasta water until glossy.",
      "Finish with parsley and serve right away.",
    ],
    servings: 4, prep_time_minutes: 10, cook_time_minutes: 12, tags: ["dinner", "quick", "seafood"],
  },
  {
    slug: "chicken-shawarma",
    title: "Chicken Shawarma",
    image_url: "/onboarding/recipes/Chicken-Shawarma-8.jpg",
    description: "Warm-spiced, yogurt-marinated thighs charred in a skillet and tucked into pita.",
    ingredients: [
      { name: "boneless chicken thighs", amount: "700", unit: "g" },
      { name: "plain yogurt", amount: "0.5", unit: "cup" },
      { name: "olive oil", amount: "3", unit: "tbsp" },
      { name: "garlic, minced", amount: "4", unit: "cloves" },
      { name: "lemon, juiced", amount: "1", unit: "" },
      { name: "cumin", amount: "2", unit: "tsp" },
      { name: "paprika", amount: "2", unit: "tsp" },
      { name: "ground coriander", amount: "1", unit: "tsp" },
      { name: "turmeric", amount: "0.5", unit: "tsp" },
      { name: "pita + tomato, cucumber, garlic sauce", amount: "", unit: "to serve" },
    ],
    steps: [
      "Whisk the yogurt, oil, garlic, lemon, and spices with a big pinch of salt.",
      "Coat the chicken and marinate at least 30 min (overnight is better).",
      "Sear in a hot skillet 5–6 min per side until charred and cooked through.",
      "Rest 5 min, then slice.",
      "Warm the pita and fill with chicken, tomato, cucumber, and garlic sauce.",
    ],
    servings: 4, prep_time_minutes: 15, cook_time_minutes: 15, tags: ["dinner", "high-protein"],
  },
  {
    slug: "fettuccine-alfredo",
    title: "Fettuccine Alfredo",
    image_url: "/onboarding/recipes/fettuccine-alfredo.jpg",
    description: "Silky parmesan cream clinging to fresh fettuccine — comfort in fifteen minutes.",
    ingredients: [
      { name: "fettuccine", amount: "300", unit: "g" },
      { name: "butter", amount: "4", unit: "tbsp" },
      { name: "heavy cream", amount: "1", unit: "cup" },
      { name: "parmesan, grated", amount: "1", unit: "cup" },
      { name: "garlic, minced", amount: "2", unit: "cloves" },
      { name: "nutmeg", amount: "1", unit: "pinch" },
    ],
    steps: [
      "Cook the fettuccine al dente; reserve a cup of pasta water, then drain.",
      "Melt the butter and soften the garlic for 1 min.",
      "Add the cream and simmer 2–3 min to thicken slightly.",
      "Off the heat, whisk in the parmesan until smooth; season with nutmeg and pepper.",
      "Toss with the pasta and a splash of pasta water until it coats. Serve immediately.",
    ],
    servings: 3, prep_time_minutes: 5, cook_time_minutes: 15, tags: ["dinner", "quick", "vegetarian"],
  },
  {
    slug: "salmon-teriyaki",
    title: "Salmon Teriyaki",
    image_url: "/onboarding/recipes/salmon terriyaki.jpg",
    description: "Crisp-skinned salmon glazed in a quick homemade teriyaki. Weeknight hero.",
    ingredients: [
      { name: "salmon fillets", amount: "4", unit: "" },
      { name: "soy sauce", amount: "0.25", unit: "cup" },
      { name: "mirin", amount: "2", unit: "tbsp" },
      { name: "sake or water", amount: "2", unit: "tbsp" },
      { name: "brown sugar", amount: "2", unit: "tbsp" },
      { name: "ginger, grated", amount: "1", unit: "tsp" },
      { name: "cornstarch", amount: "1", unit: "tsp" },
      { name: "sesame seeds + scallions", amount: "", unit: "to serve" },
    ],
    steps: [
      "Simmer the soy, mirin, sake, sugar, and ginger 2 min; thicken with a cornstarch slurry and set aside.",
      "Pat the salmon dry and sear skin-side down in a little oil, 4 min, until crisp.",
      "Flip and cook 2–3 min more to your liking.",
      "Spoon the glaze over and let it bubble and coat.",
      "Finish with sesame seeds and scallions. Serve with rice.",
    ],
    servings: 4, prep_time_minutes: 10, cook_time_minutes: 12, tags: ["dinner", "seafood", "quick"],
  },
  {
    slug: "creamy-pork-stew",
    title: "Creamy Pork Stew",
    image_url: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg",
    description: "Low-and-slow pork and carrots in a mustardy cream — the pot you come home to.",
    ingredients: [
      { name: "pork shoulder, cubed", amount: "700", unit: "g" },
      { name: "onion, diced", amount: "1", unit: "" },
      { name: "carrots, chunked", amount: "2", unit: "" },
      { name: "garlic, minced", amount: "3", unit: "cloves" },
      { name: "flour", amount: "2", unit: "tbsp" },
      { name: "chicken stock", amount: "2", unit: "cups" },
      { name: "heavy cream", amount: "0.5", unit: "cup" },
      { name: "dijon mustard", amount: "1", unit: "tbsp" },
      { name: "thyme + bay leaf", amount: "", unit: "" },
    ],
    steps: [
      "Season and brown the pork in batches in a little oil; remove.",
      "Soften the onion and carrots, then add the garlic for 30 sec.",
      "Stir in the flour for 1 min, then deglaze with the stock, scraping the bottom.",
      "Return the pork with thyme and bay; simmer covered 1.5 hrs until fork-tender.",
      "Stir in the cream and dijon and simmer 10 min more. Season and serve.",
    ],
    servings: 4, prep_time_minutes: 15, cook_time_minutes: 110, tags: ["dinner", "comfort"],
  },
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({} as { slug?: string }));
  const chosen = (typeof body.slug === "string" && STARTERS.find((s) => s.slug === body.slug))
    || STARTERS[Math.floor(Math.random() * STARTERS.length)];

  const admin = createAdminClient();

  // Deduped by title so repeat spins reuse the same row instead of piling up.
  const { data: existing } = await admin.from("recipes").select("id, title").eq("user_id", user.id).eq("title", chosen.title).maybeSingle();
  if (existing) return NextResponse.json({ seeded: false, recipe: existing });

  const { slug: _slug, ...fields } = chosen; void _slug;
  const { data, error } = await admin.from("recipes").insert({
    user_id: user.id,
    ...fields,
    meal_type: "dinner",
    notes: "A starter from Marco 🍅",
  }).select("id, title").single();
  if (error) return NextResponse.json({ error: "Could not seed a starter recipe." }, { status: 500 });

  try { await admin.from("activity_feed").insert({ user_id: user.id, activity_type: "saved_recipe", recipe_id: data.id }); } catch { /* non-critical */ }

  return NextResponse.json({ seeded: true, recipe: data });
}
