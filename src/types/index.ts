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

// Friends & Sharing
export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  friend_code: string;
  tomato_balance: number;
  created_at: string;
  updated_at: string;
}

// Gamification
export interface CookingLog {
  id: string;
  user_id: string;
  recipe_id: string;
  cooked_at: string;
  created_at: string;
  recipe?: Recipe;
}

export interface CookingGoal {
  id: string;
  user_id: string;
  weekly_target: number;
  created_at: string;
  updated_at: string;
}

export type TomatoReason = "cooked_recipe" | "community_note" | "weekly_goal_complete" | "feed_pet";

export interface TomatoTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: TomatoReason;
  reference_id: string | null;
  created_at: string;
}

export type PetMood = "happy" | "content" | "hungry" | "sad" | "very_sad";

export interface UserPet {
  id: string;
  user_id: string;
  name: string;
  hunger_level: number;
  last_fed_at: string;
  total_feedings: number;
  created_at: string;
  updated_at: string;
  mood?: PetMood;
}

export type ActivityType = "cooked_recipe" | "saved_recipe" | "completed_goal";

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  recipe_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: UserProfile;
  recipe?: Recipe;
}

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface RecipeShare {
  id: string;
  recipe_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  message: string | null;
  seen: boolean;
  created_at: string;
  recipe?: Recipe;
  shared_by?: UserProfile;
}

// Restaurant Tracker ("Eats")
export type RestaurantStatus = "wishlist" | "visited" | "favorite" | "avoid";
export type PriceRange = 1 | 2 | 3 | 4;

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  cuisine: string | null;
  neighborhood: string | null;
  address: string | null;
  city: string | null;
  google_maps_url: string | null;
  website_url: string | null;
  phone: string | null;
  price_range: PriceRange | null;
  status: RestaurantStatus;
  tags: string[];
  overall_rating: number | null;
  would_go_back: boolean | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  // Computed / joined
  visit_count?: number;
  last_visited?: string;
  visits?: RestaurantVisit[];
}

export interface RestaurantVisit {
  id: string;
  restaurant_id: string;
  user_id: string;
  visited_at: string;
  rating: number | null;
  dishes_ordered: string[];
  notes: string | null;
  companions: string | null;
  occasion: string | null;
  spent_approx: number | null;
  created_at: string;
}

export interface RestaurantList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
  restaurant_count?: number;
}
