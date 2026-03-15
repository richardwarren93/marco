export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  source_url: string | null;
  source_platform: "instagram" | "tiktok" | "other" | null;
  description: string | null;
  ingredients: Ingredient[];
  steps: string[];
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  tags: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  quantity: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  recipe_id: string | null;
  planned_date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  notes: string | null;
  created_at: string;
  recipe?: Recipe;
}

export interface MealSuggestion {
  recipe: Recipe;
  matchingIngredients: string[];
  missingIngredients: string[];
  substitutions: { original: string; substitute: string }[];
  reasoning: string;
}
