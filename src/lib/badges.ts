/**
 * Badge definitions — Pokédex-style achievement system.
 * Badges are computed from existing data, no separate badge table needed.
 */

export type BadgeCategory = "recipes" | "meal_plan" | "cooking" | "collections" | "social";
export type BadgeTier = "bronze" | "silver" | "gold";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: BadgeCategory;
  tier: BadgeTier;
  /** The stat key this badge checks against */
  statKey: string;
  /** Threshold to earn this badge */
  threshold: number;
}

export interface BadgeProgress {
  badge: BadgeDefinition;
  earned: boolean;
  current: number;
  earnedAt?: string; // approximate — earliest date the threshold was met
}

export interface BadgeStats {
  // Recipes
  totalRecipes: number;
  uniqueCuisines: number;
  hasBreakfast: boolean;
  hasLunch: boolean;
  hasDinner: boolean;
  hasSnack: boolean;
  allMealTypes: boolean;

  // Meal Plans
  totalMealPlans: number;
  weeksWith5Meals: number;
  weeksWith10Meals: number;

  // Cooking
  totalCooks: number;
  totalCookPhotos: number;
  weeksGoalMet: number;
  cookingStreak: number; // consecutive weeks meeting goal
  uniqueRecipesCooked: number;

  // Collections
  totalCollections: number;
  recipesInCollections: number;

  // Social
  totalFriends: number;
  recipesShared: number;

  // Tomatoes
  totalTomatoes: number;
  petFeedings: number;
}

// ─── Badge Definitions ───────────────────────────────────────────

export const BADGES: BadgeDefinition[] = [
  // ── Recipes ──
  {
    id: "first_recipe",
    name: "First Bite",
    description: "Save your first recipe",
    icon: "🍳",
    category: "recipes",
    tier: "bronze",
    statKey: "totalRecipes",
    threshold: 1,
  },
  {
    id: "recipe_10",
    name: "Home Cook",
    description: "Save 10 recipes",
    icon: "👨‍🍳",
    category: "recipes",
    tier: "silver",
    statKey: "totalRecipes",
    threshold: 10,
  },
  {
    id: "recipe_50",
    name: "Recipe Hoarder",
    description: "Save 50 recipes",
    icon: "📚",
    category: "recipes",
    tier: "gold",
    statKey: "totalRecipes",
    threshold: 50,
  },
  {
    id: "cuisine_3",
    name: "World Traveler",
    description: "Save recipes from 3 different cuisines",
    icon: "🌍",
    category: "recipes",
    tier: "bronze",
    statKey: "uniqueCuisines",
    threshold: 3,
  },
  {
    id: "cuisine_7",
    name: "Globe Trotter",
    description: "Save recipes from 7 different cuisines",
    icon: "✈️",
    category: "recipes",
    tier: "silver",
    statKey: "uniqueCuisines",
    threshold: 7,
  },
  {
    id: "all_meals",
    name: "Full Day",
    description: "Have recipes for breakfast, lunch, dinner & snack",
    icon: "🌅",
    category: "recipes",
    tier: "bronze",
    statKey: "allMealTypes",
    threshold: 1,
  },

  // ── Meal Planning ──
  {
    id: "first_plan",
    name: "Planner",
    description: "Add your first recipe to a meal plan",
    icon: "📅",
    category: "meal_plan",
    tier: "bronze",
    statKey: "totalMealPlans",
    threshold: 1,
  },
  {
    id: "week_5",
    name: "Meal Prepper",
    description: "Plan 5+ meals in a single week",
    icon: "🗓️",
    category: "meal_plan",
    tier: "silver",
    statKey: "weeksWith5Meals",
    threshold: 1,
  },
  {
    id: "week_10",
    name: "Fully Booked",
    description: "Plan 10+ meals in a single week",
    icon: "💪",
    category: "meal_plan",
    tier: "gold",
    statKey: "weeksWith10Meals",
    threshold: 1,
  },
  {
    id: "plans_25",
    name: "Organized",
    description: "Plan 25 total meals",
    icon: "🗂️",
    category: "meal_plan",
    tier: "silver",
    statKey: "totalMealPlans",
    threshold: 25,
  },

  // ── Cooking ──
  {
    id: "first_cook",
    name: "First Flame",
    description: "Log your first cook",
    icon: "🔥",
    category: "cooking",
    tier: "bronze",
    statKey: "totalCooks",
    threshold: 1,
  },
  {
    id: "cook_10",
    name: "Getting Warm",
    description: "Cook 10 recipes",
    icon: "🍲",
    category: "cooking",
    tier: "silver",
    statKey: "totalCooks",
    threshold: 10,
  },
  {
    id: "cook_50",
    name: "Iron Chef",
    description: "Cook 50 recipes",
    icon: "⚔️",
    category: "cooking",
    tier: "gold",
    statKey: "totalCooks",
    threshold: 50,
  },
  {
    id: "first_photo",
    name: "Food Photographer",
    description: "Upload your first cook photo",
    icon: "📸",
    category: "cooking",
    tier: "bronze",
    statKey: "totalCookPhotos",
    threshold: 1,
  },
  {
    id: "goal_1",
    name: "Goal Getter",
    description: "Meet your weekly cooking goal",
    icon: "🎯",
    category: "cooking",
    tier: "bronze",
    statKey: "weeksGoalMet",
    threshold: 1,
  },
  {
    id: "goal_4",
    name: "Consistent Cook",
    description: "Meet your weekly goal 4 times",
    icon: "🏆",
    category: "cooking",
    tier: "silver",
    statKey: "weeksGoalMet",
    threshold: 4,
  },
  {
    id: "streak_3",
    name: "On a Roll",
    description: "3-week cooking streak (meet goal every week)",
    icon: "🔥",
    category: "cooking",
    tier: "silver",
    statKey: "cookingStreak",
    threshold: 3,
  },
  {
    id: "variety_10",
    name: "Variety Chef",
    description: "Cook 10 different recipes",
    icon: "🎨",
    category: "cooking",
    tier: "silver",
    statKey: "uniqueRecipesCooked",
    threshold: 10,
  },

  // ── Collections ──
  {
    id: "first_collection",
    name: "Curator",
    description: "Create your first collection",
    icon: "📁",
    category: "collections",
    tier: "bronze",
    statKey: "totalCollections",
    threshold: 1,
  },
  {
    id: "collection_3",
    name: "Organized Kitchen",
    description: "Create 3 collections",
    icon: "🗃️",
    category: "collections",
    tier: "silver",
    statKey: "totalCollections",
    threshold: 3,
  },
  {
    id: "collect_10",
    name: "Collector",
    description: "Add 10 recipes to collections",
    icon: "📌",
    category: "collections",
    tier: "silver",
    statKey: "recipesInCollections",
    threshold: 10,
  },

  // ── Social ──
  {
    id: "first_friend",
    name: "Kitchen Buddy",
    description: "Add your first friend",
    icon: "🤝",
    category: "social",
    tier: "bronze",
    statKey: "totalFriends",
    threshold: 1,
  },
  {
    id: "friends_5",
    name: "Dinner Party",
    description: "Have 5 friends on Marco",
    icon: "🎉",
    category: "social",
    tier: "silver",
    statKey: "totalFriends",
    threshold: 5,
  },
  {
    id: "tomato_100",
    name: "Tomato Farmer",
    description: "Earn 100 tomatoes",
    icon: "🍅",
    category: "social",
    tier: "bronze",
    statKey: "totalTomatoes",
    threshold: 100,
  },
  {
    id: "tomato_500",
    name: "Tomato Tycoon",
    description: "Earn 500 tomatoes",
    icon: "🍅",
    category: "social",
    tier: "gold",
    statKey: "totalTomatoes",
    threshold: 500,
  },
  {
    id: "pet_10",
    name: "Pet Lover",
    description: "Feed your pet 10 times",
    icon: "🐱",
    category: "social",
    tier: "bronze",
    statKey: "petFeedings",
    threshold: 10,
  },
];

export function computeBadgeProgress(stats: BadgeStats): BadgeProgress[] {
  return BADGES.map((badge) => {
    const current = (stats as unknown as Record<string, number | boolean>)[badge.statKey];
    const numericCurrent = typeof current === "boolean" ? (current ? 1 : 0) : (current || 0);

    return {
      badge,
      earned: numericCurrent >= badge.threshold,
      current: numericCurrent,
    };
  });
}

export const TIER_COLORS: Record<BadgeTier, { bg: string; border: string; text: string }> = {
  bronze: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  silver: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-600" },
  gold: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  recipes: "Recipes",
  meal_plan: "Meal Plan",
  cooking: "Cooking",
  collections: "Collections",
  social: "Social",
};
