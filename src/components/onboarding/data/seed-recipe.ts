// The pre-populated recipe used in the guided first-run so the user never has
// to leave the app to find something to import. Its "extraction" is hardcoded
// (no live scrape/AI) so the magic moment is instant and can never fail.
//
// Matched to the actual reel (SEED_REEL_URL): "Viral Hot Honey Beef Taco Bowls".
// NOTE: image is a stand-in (we don't have the reel's photo) — swap the file at
// the path below for the real shot when available.

import type { SavedRecipe } from "@/components/onboarding/cookbook/RecipeImportStep";

export const SEED_REEL_URL = "https://www.instagram.com/reel/DSxK2m_jL-5/";

export const SEED_RECIPE: SavedRecipe = {
  id: "seed-reel",
  title: "Hot Honey Beef Taco Bowls",
  image_url: "/onboarding/recipes/smoked-brisket.jpg",
};

export const SEED_DETAIL = {
  mealType: "Dinner",
  prep: 10,
  cook: 20,
  servings: 2,
  ingredients: [
    { amt: "200g", name: "Sweet potato" },
    { amt: "150g", name: "Lean beef mince (5%)" },
    { amt: "1 tbsp", name: "Tomato purée" },
    { amt: "2 tbsp", name: "Cottage cheese + Greek yogurt" },
    { amt: "½", name: "Avocado" },
    { amt: "1 tbsp", name: "Honey" },
    { amt: "1 tsp", name: "Sriracha" },
    { amt: "1 tsp", name: "Taco spice blend" },
  ],
  steps: [
    "Microwave the sweet potato until soft, then crisp it in the air fryer.",
    "Brown the beef mince with the spice blend (paprika, cumin, garlic & onion powder, chili) and tomato purée.",
    "Mix the cottage cheese with Greek yogurt for a creamy, high-protein base.",
    "Stir honey, sriracha and chili flakes together for the hot honey drizzle.",
    "Build the bowl — sweet potato, beef, avocado — and finish with the hot honey.",
  ],
  grocery: ["Sweet potato", "Lean beef mince", "Cottage cheese", "Greek yogurt", "Avocado", "Hot honey"],
};
