import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
}

interface RecipeContext {
  title: string;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: string[];
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const {
      recipe,
      messages,
      userMessage,
      image,
    }: {
      recipe: RecipeContext;
      messages: ChatMessage[];
      userMessage: string;
      image?: { base64: string; mimeType: string } | null;
    } = body;

    if (!recipe || !userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing recipe context or message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch user preferences, allergies, household info, cooking history, recipes, ratings, and meal plans
    // Each query is resilient — failures don't block the chat
    const [prefsResult, profileResult, cookingLogsResult, recipesResult, ratingsResult, mealPlanResult] = await Promise.allSettled([
      supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
      supabase.from("user_profiles").select("display_name, household_size").eq("user_id", user.id).single(),
      supabase.from("cooking_logs").select("recipe_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("recipes").select("title, tags, meal_type").eq("user_id", user.id),
      supabase.from("recipe_notes").select("recipe_id, rating").eq("user_id", user.id).not("rating", "is", null),
      supabase.from("meal_plans").select("id, planned_date").eq("user_id", user.id).gte("planned_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
    ]);

    const prefs = prefsResult.status === "fulfilled" ? prefsResult.value.data : null;
    const profile = profileResult.status === "fulfilled" ? profileResult.value.data : null;
    const cookingHistory = cookingLogsResult.status === "fulfilled" ? cookingLogsResult.value.data : null;

    // Build user context
    const userContext: string[] = [];
    if (profile?.display_name) userContext.push(`User's name: ${profile.display_name}`);
    if (profile?.household_size && profile.household_size > 1) userContext.push(`Household size: ${profile.household_size} people`);
    if (prefs?.allergies?.length) userContext.push(`ALLERGIES (critical — never suggest these): ${prefs.allergies.join(", ")}`);
    if (prefs?.meal_planning_priority) userContext.push(`Cooking priority: ${prefs.meal_planning_priority}`);
    if (prefs?.motivation) userContext.push(`Why they use Marco: ${prefs.motivation}`);
    if (prefs?.household_type) userContext.push(`Household type: ${prefs.household_type}`);
    if (prefs?.taste_profile) {
      const tp = prefs.taste_profile;
      if (tp.topCuisines?.length) userContext.push(`Favorite cuisines: ${tp.topCuisines.join(", ")}`);
      if (tp.flavorProfile) {
        const flavors = Object.entries(tp.flavorProfile).sort(([,a]: [string, any], [,b]: [string, any]) => b - a).slice(0, 3).map(([k]) => k);
        userContext.push(`Flavor preferences: loves ${flavors.join(", ")}`);
      }
      if (tp.cookingStyles?.length) userContext.push(`Cooking style: ${tp.cookingStyles.join(", ")}`);
    }
    if (cookingHistory?.length) userContext.push(`Recently cooked ${cookingHistory.length} meals — this is an active cook`);

    // Behavioral signals from recipe library
    const recipes = recipesResult.status === "fulfilled" ? recipesResult.value.data : null;
    if (recipes?.length) {
      userContext.push(`Has ${recipes.length} saved recipes`);

      // Extract dominant tags/cuisines from their library
      const tagCounts: Record<string, number> = {};
      const mealTypeCounts: Record<string, number> = {};
      recipes.forEach((r) => {
        if (r.tags) r.tags.forEach((t: string) => {
          tagCounts[t.toLowerCase()] = (tagCounts[t.toLowerCase()] || 0) + 1;
        });
        if (r.meal_type) mealTypeCounts[r.meal_type] = (mealTypeCounts[r.meal_type] || 0) + 1;
      });

      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([tag, count]) => `${tag} (${count})`);
      if (topTags.length) userContext.push(`Most common recipe tags in their library: ${topTags.join(", ")}`);

      const mealBreakdown = Object.entries(mealTypeCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => `${type}: ${count}`)
        .join(", ");
      if (mealBreakdown) userContext.push(`Recipe types saved: ${mealBreakdown}`);
    }

    // Ratings — what they love vs dislike
    const ratings = ratingsResult.status === "fulfilled" ? ratingsResult.value.data : null;
    if (ratings?.length) {
      const highRated = ratings.filter((r) => r.rating >= 4).length;
      const lowRated = ratings.filter((r) => r.rating <= 2).length;
      if (highRated) userContext.push(`Has rated ${highRated} recipes 4-5 stars — knows what they like`);
      if (lowRated) userContext.push(`Has rated ${lowRated} recipes 1-2 stars — has clear dislikes`);
    }

    // Meal planning frequency
    const mealPlans = mealPlanResult.status === "fulfilled" ? mealPlanResult.value.data : null;
    if (mealPlans?.length) {
      const uniqueDays = new Set(mealPlans.map((m) => m.planned_date)).size;
      const mealsPerWeek = Math.round((mealPlans.length / 4));
      userContext.push(`Plans ~${mealsPerWeek} meals/week, covering ${uniqueDays} unique days in the last month`);
    }

    // Add learned insights from previous Cook with Marco sessions
    if (prefs?.taste_profile?.learned_insights) {
      const insights = prefs.taste_profile.learned_insights;
      if (insights.likes?.length) userContext.push(`Ingredients/flavors they love: ${insights.likes.join(", ")}`);
      if (insights.dislikes?.length) userContext.push(`Ingredients/flavors they dislike: ${insights.dislikes.join(", ")}`);
      if (insights.dietary_notes?.length) userContext.push(`Dietary goals: ${insights.dietary_notes.join(", ")}`);
      if (insights.cookware?.length) userContext.push(`Cookware they have: ${insights.cookware.join(", ")}`);
      if (insights.skill_signals?.length) userContext.push(`Skill level signals: ${insights.skill_signals.join(", ")}`);
      if (insights.flavor_preferences?.length) userContext.push(`Flavor preferences: ${insights.flavor_preferences.join(", ")}`);
      if (insights.cooking_style_notes?.length) userContext.push(`Cooking style: ${insights.cooking_style_notes.join(", ")}`);
      const sessionCount = prefs.taste_profile.learn_session_count || 0;
      if (sessionCount > 0) userContext.push(`You've learned from ${sessionCount} previous cooking sessions with this user`);
    }

    const userContextBlock = userContext.length > 0 ? `\n\nUSER PROFILE (use this to personalize your advice — you've learned these preferences over time from cooking with this user):\n${userContext.join("\n")}` : "";

    // Build recipe context for system prompt
    const ingredientList = recipe.ingredients
      .map((i) => `- ${i.amount || ""} ${i.unit || ""} ${i.name}`.trim())
      .join("\n");

    const stepsList = recipe.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");

    const nutritionInfo =
      recipe.calories != null
        ? `\nNutrition per serving: ${recipe.calories} cal, ${recipe.protein_g ?? "?"}g protein, ${recipe.carbs_g ?? "?"}g carbs, ${recipe.fat_g ?? "?"}g fat`
        : "";

    const systemPrompt = `You are Marco, a friendly and knowledgeable cooking assistant in the Marco recipe app. You're helping the user cook this specific recipe. You know their food preferences better than anyone and get smarter about their taste over time.

RECIPE: ${recipe.title}
Servings: ${recipe.servings ?? "Not specified"}
Prep time: ${recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min` : "Not specified"}
Cook time: ${recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min` : "Not specified"}
Tags: ${recipe.tags?.join(", ") || "None"}${nutritionInfo}

INGREDIENTS:
${ingredientList}

STEPS:
${stepsList}${userContextBlock}

YOUR PERSONALITY:
- Warm, encouraging, and knowledgeable — like a supportive friend who loves cooking
- Keep responses concise and practical (2-4 sentences for simple questions, more for detailed technique explanations)
- Use casual language but be precise about measurements and temperatures
- Personalize advice based on the user's profile — if they're allergic to something, proactively flag it. If they prefer spicy food, suggest ways to amp up heat
- If their household size is >1, consider scaling suggestions accordingly

WHAT YOU CAN HELP WITH:
- Substituting ingredients (explain taste/texture impact)
- Making the recipe healthier, easier, or faster
- Adapting for dietary restrictions or allergies
- Cookware/tool alternatives ("I don't have a blender")
- Technique guidance ("What does 'fold in' mean?")
- Photo feedback — if they send a photo, analyze doneness, color, texture, plating and give specific actionable feedback
- "What do I do next?" — walk them through steps one at a time
- "How do I make this taste even better?" — suggest finishing touches, seasoning adjustments, garnishes
- Scaling up or down for different serving sizes
- Wine or drink pairing suggestions
- Storage and reheating instructions
- Timing coordination ("How do I time everything to be ready at once?")

RULES:
- NEVER suggest ingredients the user is allergic to
- Always stay in context of THIS recipe unless asked about something else
- If modifying the recipe, give specific adjusted ingredients/amounts
- When analyzing photos, be encouraging but honest — point out what looks great AND what could improve
- Use occasional cooking emoji but don't overdo it`;

    // Build the conversation messages for Claude
    const claudeMessages: Array<{
      role: "user" | "assistant";
      content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
    }> = [];

    // Add conversation history
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Build the new user message content
    if (image?.base64) {
      claudeMessages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mimeType,
              data: image.base64,
            },
          },
          {
            type: "text",
            text: userMessage,
          },
        ],
      });
    } else {
      claudeMessages.push({
        role: "user",
        content: userMessage,
      });
    }

    // Non-streaming response (reliable)
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages as Anthropic.MessageParam[],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Return as SSE format so the client reader still works
    const encoder = new TextEncoder();
    const sseData = `data: ${JSON.stringify({ text })}\n\ndata: [DONE]\n\n`;

    return new Response(encoder.encode(sseData), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process chat message" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
