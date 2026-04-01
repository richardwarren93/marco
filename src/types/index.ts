// Notifications
export type NotificationType = "friend_request" | "friend_accepted" | "recipe_shared" | "recipe_saved";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  reference_id: string | null; // friendship_id or recipe_share_id
  recipe_title: string | null;
  read: boolean;
  created_at: string;
}

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
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
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
  preview_images?: string[];
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

export interface UserEquipment {
  id: string;
  user_id: string;
  equipment_name: string;
  created_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  recipe_id: string | null;
  planned_date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  notes: string | null;
  servings: number | null;
  created_at: string;
  recipe?: Recipe;
  owner_name?: string;
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
  image_url: string | null;
  caption: string | null;
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
  image_url: string | null;
  caption: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  profile?: UserProfile;
  recipe?: Recipe;
  userVote?: "up" | "down" | null;
}

export interface RecipeNote {
  id: string;
  user_id: string;
  recipe_id: string;
  private_note: string;
  personal_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface GroceryList {
  id: string;
  user_id: string;
  week_start: string;
  date_end: string | null;
  generated_at: string | null;
  meal_count: number | null;
  created_at: string;
  items?: GroceryItem[];
}

export interface GroceryItem {
  id: string;
  list_id: string;
  name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
  recipe_sources: string[];
  checked: boolean;
  is_custom: boolean;
  in_pantry: boolean;
  // v2 fields
  soft_deleted: boolean;
  name_override: string | null;
  amount_override: string | null;
  unit_override: string | null;
  category_override: string | null;
  created_at: string;
}

export interface FeedVote {
  id: string;
  user_id: string;
  activity_id: string;
  vote_type: "up" | "down";
  created_at: string;
}

// Nutrition
export interface RecipeNutrition {
  id: string;
  recipe_id: string;
  user_id: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  confidence: "high" | "medium" | "low" | null;
  notes: string | null;
  estimated_at: string;
  model_version: string | null;
}

// Meal Plan Insights
export interface MealPlanInsights {
  overallScore: number;
  scoreLabel: string;
  headline: string;
  nutritionAnalysis: {
    dailyCalorieAvg: number;
    calorieAssessment: string;
    macroBalance: string;
    fiberAssessment: string;
    proteinAdequacy: string;
  };
  balanceInsights: Array<{
    icon: string;
    title: string;
    detail: string;
    severity: "positive" | "suggestion" | "warning";
  }>;
  recommendations: Array<{
    emoji: string;
    text: string;
  }>;
  varietyScore: number;
  varietyNote: string;
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

// Household
export interface Household {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
  members?: HouseholdMember[];
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  profile?: UserProfile;
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

// Onboarding
export interface TasteProfile {
  flavor: string[];
  texture: string[];
  cuisine: string[];
  nutritional_bias: string[];
  cooking_style: string[];
  ingredient_affinities: string[];
}

export interface OnboardingData {
  kitchen_pal: string;
  motivation: string;
  meal_planning_priority: string;
  meals_per_week: string;
  household_size: number;
  household_type: string | null;
  allergies: string[];
  taste_profile: TasteProfile;
  liked_recipe_ids: string[];
}

export interface UserPreferences {
  id: string;
  user_id: string;
  kitchen_pal: string | null;
  motivation: string | null;
  meal_planning_priority: string | null;
  meals_per_week: string | null;
  household_size: number;
  household_type: string | null;
  allergies: string[];
  taste_profile: TasteProfile;
  liked_recipe_ids: string[];
  created_at: string;
  updated_at: string;
}
