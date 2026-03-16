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
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
  recipe_count?: number;
}

export interface CollectionRecipe {
  id: string;
  collection_id: string;
  recipe_id: string;
  added_at: string;
}

export interface RecipeRating {
  id: string;
  user_id: string;
  source_url: string;
  rating: number;
  created_at: string;
}

export interface CommunityNote {
  id: string;
  user_id: string;
  source_url: string;
  content: string;
  created_at: string;
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
