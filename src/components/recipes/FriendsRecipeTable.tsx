"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FriendRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string[];
  image_url: string | null;
  source_platform: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  meal_type: string;
  created_at: string;
  owner_name: string;
  owner_avatar: string | null;
  owner_id: string;
  is_planned: boolean;
  planning_friends: { name: string; avatar: string | null }[];
  next_planned_date: string | null;
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatPlannedDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 0 && diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FriendsRecipeTable({
  onAddToMealPlan,
  onAddToCollection,
}: {
  onAddToMealPlan?: (recipeId: string) => void;
  onAddToCollection?: (recipeId: string) => void;
}) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<FriendRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchFriendsActivity() {
      try {
        const res = await fetch("/api/recipes/friends-activity");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setRecipes(data.recipes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchFriendsActivity();
  }, []);

  async function handleSaveRecipe(recipe: FriendRecipe) {
    if (savingIds.has(recipe.id) || savedIds.has(recipe.id)) return;
    setSavingIds((prev) => new Set(prev).add(recipe.id));
    try {
      // Fetch full recipe details first
      const detailRes = await fetch(`/api/recipes/${recipe.id}`);
      if (!detailRes.ok) throw new Error("Could not load recipe");
      const detail = await detailRes.json();
      const r = detail.recipe || detail;

      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: r.title,
          description: r.description,
          ingredients: r.ingredients,
          steps: r.steps,
          servings: r.servings,
          prep_time_minutes: r.prep_time_minutes,
          cook_time_minutes: r.cook_time_minutes,
          tags: r.tags,
          meal_type: r.meal_type,
          source_url: r.source_url,
          source_platform: r.source_platform,
          image_url: r.image_url,
          notes: r.notes ? `${r.notes}\n\nSaved from ${recipe.owner_name}` : `Saved from ${recipe.owner_name}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.duplicate) {
          setSavedIds((prev) => new Set(prev).add(recipe.id));
          return;
        }
        throw new Error(data.error || "Failed to save");
      }
      setSavedIds((prev) => new Set(prev).add(recipe.id));
    } catch (err) {
      console.error("Save recipe error:", err);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(recipe.id);
        return next;
      });
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="px-4 pb-8 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-3 shadow-sm animate-pulse">
            <div className="flex gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="px-4 pb-8">
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <span className="text-3xl mb-3 block">😕</span>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (recipes.length === 0) {
    return (
      <div className="px-4 pb-8">
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <span className="text-4xl mb-3 block">👋</span>
          <p className="text-base font-semibold text-gray-800 mb-1">
            No friend activity yet
          </p>
          <p className="text-sm text-gray-400 max-w-[260px] mx-auto leading-relaxed">
            When your friends save or plan recipes, they&apos;ll show up here
          </p>
          <button
            onClick={() => router.push("/friends")}
            className="mt-4 px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors shadow-sm"
          >
            Find friends
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-28 space-y-2.5 max-w-3xl mx-auto">
      {/* Section: Friends cooking now */}
      {recipes.some((r) => r.is_planned) && (
        <>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-1">
            🔥 Friends are cooking
          </p>
          {recipes
            .filter((r) => r.is_planned)
            .map((recipe) => (
              <FriendRecipeCard
                key={recipe.id}
                recipe={recipe}
                onTap={() => router.push(`/recipes/${recipe.id}`)}
                onSave={() => handleSaveRecipe(recipe)}
                onAddToMealPlan={onAddToMealPlan ? () => onAddToMealPlan(recipe.id) : undefined}
                onAddToCollection={onAddToCollection ? () => onAddToCollection(recipe.id) : undefined}
                isSaving={savingIds.has(recipe.id)}
                isSaved={savedIds.has(recipe.id)}
              />
            ))}
        </>
      )}

      {/* Section: Recently saved */}
      {recipes.some((r) => !r.is_planned) && (
        <>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-3">
            📚 Recently saved by friends
          </p>
          {recipes
            .filter((r) => !r.is_planned)
            .map((recipe) => (
              <FriendRecipeCard
                key={recipe.id}
                recipe={recipe}
                onTap={() => router.push(`/recipes/${recipe.id}`)}
                onSave={() => handleSaveRecipe(recipe)}
                onAddToMealPlan={onAddToMealPlan ? () => onAddToMealPlan(recipe.id) : undefined}
                onAddToCollection={onAddToCollection ? () => onAddToCollection(recipe.id) : undefined}
                isSaving={savingIds.has(recipe.id)}
                isSaved={savedIds.has(recipe.id)}
              />
            ))}
        </>
      )}
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function FriendRecipeCard({
  recipe,
  onTap,
  onSave,
  onAddToMealPlan,
  onAddToCollection,
  isSaving,
  isSaved,
}: {
  recipe: FriendRecipe;
  onTap: () => void;
  onSave: () => void;
  onAddToMealPlan?: () => void;
  onAddToCollection?: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const emoji = MEAL_EMOJIS[recipe.meal_type] ?? "🍳";

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform cursor-pointer"
      onClick={onTap}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
          {recipe.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-2xl">{emoji}</span>
          )}
          {/* Planning badge */}
          {recipe.is_planned && (
            <div className="absolute top-1 left-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              COOKING
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
              {recipe.title}
            </p>
            {/* Friend attribution */}
            <div className="flex items-center gap-1.5 mt-1">
              {recipe.owner_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.owner_avatar}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-[8px]">👤</span>
                </div>
              )}
              <span className="text-xs text-gray-500 truncate">
                {recipe.owner_name}
                {recipe.is_planned && recipe.next_planned_date && (
                  <span className="text-green-600 font-medium">
                    {" · cooking "}
                    {formatPlannedDate(recipe.next_planned_date)}
                  </span>
                )}
                {!recipe.is_planned && (
                  <span className="text-gray-400"> · {timeAgo(recipe.created_at)}</span>
                )}
              </span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1.5">
            {totalTime > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {totalTime}m
              </span>
            )}
            {recipe.tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center border-t border-gray-50 divide-x divide-gray-50">
        {/* Save */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={isSaving || isSaved}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            isSaved
              ? "text-green-600 bg-green-50/50"
              : isSaving
              ? "text-gray-400"
              : "text-gray-500 hover:text-orange-600 hover:bg-orange-50/50"
          }`}
        >
          {isSaved ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          ) : isSaving ? (
            <>
              <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Save
            </>
          )}
        </button>

        {/* Add to collection */}
        {onAddToCollection && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCollection();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50/50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Collect
          </button>
        )}

        {/* Add to meal plan */}
        {onAddToMealPlan && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToMealPlan();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50/50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Plan
          </button>
        )}
      </div>
    </div>
  );
}
