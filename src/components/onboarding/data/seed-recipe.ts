// The pre-populated recipe used in the guided first-run so the user never has
// to leave the app to find something to import. Its "extraction" is hardcoded
// (no live scrape/AI) so the magic moment is instant and can never fail.
//
// PLACEHOLDER: title/image/ingredients are a stand-in for the actual Instagram
// reel below — swap them to match the reel's real dish.

import type { SavedRecipe } from "@/components/onboarding/cookbook/RecipeImportStep";

export const SEED_REEL_URL = "https://www.instagram.com/reel/DSxK2m_jL-5/";

export const SEED_RECIPE: SavedRecipe = {
  id: "seed-reel",
  title: "Teriyaki Salmon",
  image_url: "/onboarding/recipes/salmon terriyaki.jpg",
};

export const SEED_DETAIL = {
  mealType: "Dinner",
  prep: 10,
  cook: 15,
  servings: 4,
  ingredients: [
    { amt: "2 tbsp", name: "Olive oil" },
    { amt: "4 fillets", name: "Salmon" },
    { amt: "3 tbsp", name: "Soy sauce" },
    { amt: "2 tbsp", name: "Honey" },
    { amt: "3 cloves", name: "Garlic, minced" },
    { amt: "1 tsp", name: "Fresh ginger" },
  ],
  steps: [
    "Pat the salmon dry and season with salt and pepper.",
    "Whisk soy sauce, honey, garlic and ginger into a glaze.",
    "Sear the salmon skin-side down over medium-high, 4 minutes.",
    "Flip, pour in the glaze, and spoon over until glossy.",
    "Rest 2 minutes, then serve over rice with the pan sauce.",
  ],
  grocery: ["Salmon fillets", "Soy sauce", "Honey", "Garlic", "Fresh ginger", "Jasmine rice"],
};
