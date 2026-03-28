import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeBadgeProgress } from "@/lib/badges";
import type { BadgeStats } from "@/lib/badges";

/** Known cuisine-related tags to count for "unique cuisines" badge */
const CUISINE_TAGS = new Set([
  "italian", "mexican", "chinese", "japanese", "korean", "thai",
  "indian", "french", "mediterranean", "greek", "vietnamese",
  "american", "southern", "cajun", "ethiopian", "moroccan",
  "turkish", "middle eastern", "brazilian", "peruvian", "spanish",
  "german", "british", "caribbean", "filipino", "indonesian",
  "malaysian", "taiwanese", "hawaiian", "cuban", "argentinian",
  "lebanese", "persian", "irish", "polish", "russian",
  "scandinavian", "african", "asian", "european", "latin",
]);

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Run all queries in parallel
  const [
    recipesRes,
    mealPlansRes,
    cookingLogsRes,
    collectionsRes,
    collectionRecipesRes,
    friendsRes,
    tomatoRes,
    petRes,
    goalCompletionsRes,
    sharesRes,
  ] = await Promise.all([
    // All user recipes with tags and meal_type
    admin.from("recipes").select("id, tags, meal_type").eq("user_id", user.id),

    // All meal plans
    admin.from("meal_plans").select("id, planned_date").eq("user_id", user.id),

    // All cooking logs
    admin.from("cooking_logs").select("id, recipe_id, cooked_at, image_url").eq("user_id", user.id),

    // Collections count
    admin.from("collections").select("id").eq("user_id", user.id),

    // Collection recipe entries
    admin
      .from("collection_recipes")
      .select("id, collection_id")
      .in(
        "collection_id",
        // Subquery: get user's collection IDs
        (await admin.from("collections").select("id").eq("user_id", user.id)).data?.map((c) => c.id) || []
      ),

    // Friends
    admin
      .from("friendships")
      .select("id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted"),

    // Tomato balance
    admin.from("user_profiles").select("tomato_balance").eq("user_id", user.id).single(),

    // Pet feedings
    admin.from("user_pets").select("total_feedings").eq("user_id", user.id).maybeSingle(),

    // Weeks where goal was completed (from tomato transactions)
    admin
      .from("tomato_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("reason", "weekly_goal_complete"),

    // Recipe shares sent
    admin.from("recipe_shares").select("id").eq("shared_by_user_id", user.id),
  ]);

  const recipes = recipesRes.data || [];
  const mealPlans = mealPlansRes.data || [];
  const cookingLogs = cookingLogsRes.data || [];
  const collections = collectionsRes.data || [];
  const collectionRecipes = collectionRecipesRes.data || [];
  const friends = friendsRes.data || [];

  // ── Compute recipe stats ──
  const uniqueCuisines = new Set<string>();
  const mealTypes = new Set<string>();

  let dessertRecipes = 0;

  for (const recipe of recipes) {
    if (recipe.meal_type) mealTypes.add(recipe.meal_type);
    if (recipe.tags && Array.isArray(recipe.tags)) {
      for (const tag of recipe.tags) {
        const lower = tag.toLowerCase().trim();
        if (CUISINE_TAGS.has(lower)) {
          uniqueCuisines.add(lower);
        }
        if (lower === "dessert" || lower === "desserts") {
          dessertRecipes++;
        }
      }
    }
    if (recipe.meal_type?.toLowerCase() === "dessert") {
      dessertRecipes++;
    }
  }

  // ── Compute meal plan stats ──
  // Group meal plans by week
  const weekMealCounts = new Map<string, number>();
  for (const plan of mealPlans) {
    const weekKey = getWeekStart(new Date(plan.planned_date));
    weekMealCounts.set(weekKey, (weekMealCounts.get(weekKey) || 0) + 1);
  }

  let weeksWith5Meals = 0;
  let weeksWith10Meals = 0;
  for (const count of weekMealCounts.values()) {
    if (count >= 5) weeksWith5Meals++;
    if (count >= 10) weeksWith10Meals++;
  }

  // ── Compute cooking stats ──
  const uniqueRecipesCooked = new Set(cookingLogs.map((l) => l.recipe_id)).size;
  const totalCookPhotos = cookingLogs.filter((l) => l.image_url).length;

  // Cooking streak — consecutive weeks meeting goal
  const weeksGoalMet = (goalCompletionsRes.data || []).length;

  // For streak calculation, group cooks by week and see how many consecutive recent weeks had goal met
  // Simplified: use goal completion transactions as proxy
  let cookingStreak = 0;
  if (weeksGoalMet > 0) {
    // Count backwards from current week
    const now = new Date();
    let checkWeek = new Date(now);
    const cookWeeks = new Set<string>();
    for (const log of cookingLogs) {
      cookWeeks.add(getWeekStart(new Date(log.cooked_at)));
    }

    // Simple streak: count consecutive recent weeks with at least 1 cook
    // (Full goal-based streak would need goal data per week)
    for (let i = 0; i < 52; i++) {
      const weekKey = getWeekStart(checkWeek);
      if (cookWeeks.has(weekKey)) {
        cookingStreak++;
      } else if (i > 0) {
        break; // Streak broken
      }
      checkWeek.setDate(checkWeek.getDate() - 7);
    }
  }

  // ── Build stats object ──
  const stats: BadgeStats = {
    totalRecipes: recipes.length,
    uniqueCuisines: uniqueCuisines.size,
    hasBreakfast: mealTypes.has("breakfast"),
    hasLunch: mealTypes.has("lunch"),
    hasDinner: mealTypes.has("dinner"),
    hasSnack: mealTypes.has("snack"),
    allMealTypes: mealTypes.has("breakfast") && mealTypes.has("lunch") && mealTypes.has("dinner") && mealTypes.has("snack"),

    totalMealPlans: mealPlans.length,
    weeksWith5Meals,
    weeksWith10Meals,

    totalCooks: cookingLogs.length,
    totalCookPhotos,
    weeksGoalMet,
    cookingStreak,
    uniqueRecipesCooked,

    totalCollections: collections.length,
    recipesInCollections: collectionRecipes.length,

    totalFriends: friends.length,
    recipesShared: (sharesRes.data || []).length,

    totalTomatoes: tomatoRes.data?.tomato_balance || 0,
    petFeedings: petRes.data?.total_feedings || 0,

    dessertRecipes,
  };

  const progress = computeBadgeProgress(stats);
  const earned = progress.filter((p) => p.earned).length;
  const total = progress.length;

  return NextResponse.json({ progress, stats, earned, total });
}
