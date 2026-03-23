"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Recipe, Ingredient } from "@/types";
import SocialEmbed from "@/components/recipes/SocialEmbed";
import RecipeForm from "@/components/recipes/RecipeForm";
import AddToCollectionModal from "@/components/collections/AddToCollectionModal";
import CommunitySection from "@/components/community/CommunitySection";
import ShareWithFriendsModal from "@/components/friends/ShareWithFriendsModal";
import IMadeThisButton from "@/components/gamification/IMadeThisButton";
import MyNotesCard from "@/components/recipes/MyNotesCard";

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

/** Parse a string amount (e.g. "1/2", "1.5", "2") into a number, scale it, and format nicely. */
function scaleAmount(raw: string | undefined, ratio: number): string {
  if (!raw) return "";
  // Try to parse as a fraction like "1/2" or mixed like "1 1/2"
  const trimmed = raw.trim();
  if (!trimmed) return "";

  let value: number | null = null;

  // Mixed fraction: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    value = parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Simple fraction: "1/2"
  if (value === null) {
    const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
    if (fracMatch) {
      value = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
    }
  }

  // Decimal or integer
  if (value === null) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) value = num;
  }

  // Can't parse — return original
  if (value === null) return trimmed;

  const scaled = value * ratio;

  // Format: use fractions for common values, otherwise round to 1 decimal
  return formatAmount(scaled);
}

function formatAmount(n: number): string {
  // Round to avoid floating point noise
  const rounded = Math.round(n * 100) / 100;

  // Common fractions
  const fractions: [number, string][] = [
    [0.125, "1/8"], [0.25, "1/4"], [0.333, "1/3"], [0.5, "1/2"],
    [0.667, "2/3"], [0.75, "3/4"],
  ];

  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  // Check if the fractional part matches a common fraction
  for (const [val, str] of fractions) {
    if (Math.abs(frac - val) < 0.04) {
      return whole > 0 ? `${whole} ${str}` : str;
    }
  }

  // Whole number
  if (Math.abs(frac) < 0.04) return `${whole}`;

  // Decimal — one place max
  return rounded % 1 === 0 ? `${rounded}` : `${Math.round(rounded * 10) / 10}`;
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showShareWithFriends, setShowShareWithFriends] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps">("ingredients");
  const [adjustedServings, setAdjustedServings] = useState<number | null>(null);
  const [showMealPlanPrompt, setShowMealPlanPrompt] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchRecipe = useCallback(async () => {
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();
    setRecipe(data as Recipe | null);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  async function handleDelete() {
    if (!confirm("Delete this recipe?")) return;
    setDeleting(true);
    await supabase.from("recipes").delete().eq("id", id);
    router.push("/recipes");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <p className="text-gray-400">Recipe not found</p>
        <Link href="/recipes" className="text-orange-500 text-sm font-medium hover:underline">
          Back to recipes
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <RecipeForm
          recipe={recipe}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            fetchRecipe();
          }}
        />
      </div>
    );
  }

  const ingredients = recipe.ingredients as Ingredient[];
  const steps = recipe.steps as string[];
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const originalServings = recipe.servings || null;
  const currentServings = adjustedServings ?? originalServings;
  const servingsChanged = originalServings && adjustedServings && adjustedServings !== originalServings;
  const ratio = originalServings && currentServings ? currentServings / originalServings : 1;

  function changeServings(delta: number) {
    const base = currentServings || 1;
    const next = Math.max(1, base + delta);
    setAdjustedServings(next);
    // Show meal plan prompt when servings change from original
    if (originalServings && next !== originalServings) {
      setShowMealPlanPrompt(true);
    }
  }

  function resetServings() {
    setAdjustedServings(null);
    setShowMealPlanPrompt(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Hero Image ──────────────────────────────────────────────────── */}
      <div className="relative">
        {recipe.image_url ? (
          <div className="h-64 sm:h-80 bg-gray-100 relative">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
            <span className="text-5xl">{MEAL_ICONS[recipe.meal_type] || "🍽️"}</span>
          </div>
        )}

        {/* Overlaid nav */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <svg className="w-4.5 h-4.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 shadow-sm hover:bg-white transition-colors"
            >
              Edit
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <svg className="w-4.5 h-4.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
              {showMore && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMore(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30 py-1 min-w-[140px] animate-pop-in">
                    <button
                      onClick={() => { setShowMore(false); handleDelete(); }}
                      disabled={deleting}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deleting ? "Deleting..." : "Delete recipe"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="px-4 -mt-4 relative z-10">
        {/* Title card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{recipe.description}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            {recipe.meal_type && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                recipe.meal_type === "breakfast" ? "bg-amber-50 text-amber-700" :
                recipe.meal_type === "lunch" ? "bg-green-50 text-green-700" :
                recipe.meal_type === "dinner" ? "bg-violet-50 text-violet-700" :
                "bg-orange-50 text-orange-700"
              }`}>
                {MEAL_ICONS[recipe.meal_type]} {recipe.meal_type}
              </span>
            )}
            {totalTime > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {recipe.prep_time_minutes ? `${recipe.prep_time_minutes}m prep` : ""}
                {recipe.prep_time_minutes && recipe.cook_time_minutes ? " · " : ""}
                {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m cook` : ""}
              </span>
            )}
            {recipe.servings && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                {recipe.servings} servings
              </span>
            )}
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Action Buttons ──────────────────────────────────────────── */}
        <div className="flex items-center justify-around py-4">
          {[
            {
              label: "Collection",
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              ),
              onClick: () => setShowAddToCollection(true),
            },
            {
              label: "Meal Plan",
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              ),
              onClick: () => router.push("/meal-plan"),
            },
            {
              label: "Share",
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              ),
              onClick: () => setShowShareWithFriends(true),
            },
            ...(recipe.source_url
              ? [
                  {
                    label: "Source",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    ),
                    onClick: () => window.open(recipe.source_url!, "_blank"),
                  },
                ]
              : []),
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-1.5 text-gray-500 hover:text-orange-500 transition-colors touch-manipulation"
            >
              <div className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center hover:border-orange-300 hover:bg-orange-50 transition-colors">
                {action.icon}
              </div>
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* ── I Made This + Notes ─────────────────────────────────────── */}
        <div className="space-y-3 mb-4">
          <IMadeThisButton recipeId={recipe.id} />
          <MyNotesCard recipeId={recipe.id} />
        </div>

        {/* ── Tabbed Content: Ingredients / Steps ─────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("ingredients")}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative ${
                activeTab === "ingredients"
                  ? "text-orange-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Ingredients
              {activeTab === "ingredients" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("steps")}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative ${
                activeTab === "steps"
                  ? "text-orange-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Steps
              {activeTab === "steps" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === "ingredients" ? (
              <div>
                {/* Servings adjuster */}
                {originalServings && (
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">Servings</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => changeServings(-1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 active:scale-95 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" d="M5 12h14" />
                        </svg>
                      </button>
                      <span className={`text-sm font-bold w-5 text-center tabular-nums ${servingsChanged ? "text-orange-600" : "text-gray-900"}`}>
                        {currentServings}
                      </span>
                      <button
                        onClick={() => changeServings(1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 active:scale-95 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
                        </svg>
                      </button>
                      {servingsChanged && (
                        <button
                          onClick={resetServings}
                          className="text-[10px] text-gray-400 hover:text-gray-600 font-medium ml-1 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Meal plan prompt */}
                {showMealPlanPrompt && servingsChanged && (
                  <div className="mb-4 p-3 bg-orange-50 rounded-xl border border-orange-100 animate-slide-up">
                    <p className="text-xs text-orange-700 font-medium mb-2">
                      Adjusted to {currentServings} servings — add to your meal plan?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push("/meal-plan")}
                        className="flex-1 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all"
                      >
                        Add to Meal Plan
                      </button>
                      <button
                        onClick={() => setShowMealPlanPrompt(false)}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}

                {/* Ingredient list */}
                <ul className="space-y-3">
                  {ingredients.map((ing, i) => {
                    const scaledAmount = scaleAmount(ing.amount, ratio);
                    return (
                      <li key={i} className="flex items-baseline gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                        <span className="text-sm text-gray-800">
                          {scaledAmount && (
                            <span className={`font-semibold ${servingsChanged ? "text-orange-600" : ""}`}>
                              {scaledAmount}{" "}
                            </span>
                          )}
                          {ing.unit && <span className="text-gray-500">{ing.unit} </span>}
                          {ing.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <ol className="space-y-4">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{step}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ── Social Embed ────────────────────────────────────────────── */}
        {recipe.source_url && recipe.source_platform && recipe.source_platform !== "other" && (
          <div className="mb-4">
            <SocialEmbed
              sourceUrl={recipe.source_url}
              sourcePlatform={recipe.source_platform}
            />
          </div>
        )}

        {/* ── Community ───────────────────────────────────────────────── */}
        {recipe.source_url && (
          <div className="mb-6">
            <CommunitySection sourceUrl={recipe.source_url} />
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AddToCollectionModal
        recipeId={recipe.id}
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
      />

      <ShareWithFriendsModal
        isOpen={showShareWithFriends}
        onClose={() => setShowShareWithFriends(false)}
        itemType="recipe"
        itemId={recipe.id}
        itemTitle={recipe.title}
      />
    </div>
  );
}
