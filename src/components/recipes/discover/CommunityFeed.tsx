"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import type { Recipe } from "@/types";
import { useTrending } from "@/lib/hooks/use-data";
import SharedRecipeCard from "@/components/recipes/SharedRecipeCard";
import TomatoFlourish from "@/components/brand/TomatoFlourish";
import { useToast } from "@/components/ui/Toast";

interface TrendingRecipe {
  recipeId: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  meal_type: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  source_url: string | null;
  saveCount: number;
  userCount: number;
}

interface Props {
  onTap: (recipeId: string) => void;
  onLongPress: (recipeId: string, title: string) => (e: React.TouchEvent) => void;
  onLongPressCancel: () => void;
  onContextMenu: (recipeId: string, title: string) => (e: React.MouseEvent) => void;
  /** Open the AddToCollectionModal with the user's saved copy of the recipe. */
  onAddToCollection?: (savedRecipeId: string) => void;
}

/**
 * Community-feed surface. A single editorial grid of trending recipes —
 * no carousel, no categorized rows. Per the brand: a marco-mono eyebrow
 * over a Fraunces title, with the tomato flourish as the divider.
 */
export default function CommunityFeed({
  onTap,
  onLongPress,
  onLongPressCancel,
  onContextMenu,
  onAddToCollection,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const { data, isLoading } = useTrending();
  const trending: TrendingRecipe[] = (data?.trending ?? []) as TrendingRecipe[];

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  // Trending recipe ID → user's saved copy ID, captured from /api/recipes/save
  // so the bookmark action can open AddToCollectionModal on the owned row.
  const [savedIdMap, setSavedIdMap] = useState<Map<string, string>>(new Map());

  async function saveRecipe(recipe: TrendingRecipe, opts: { showToast?: boolean } = {}): Promise<string | null> {
    if (savedIds.has(recipe.recipeId)) {
      return savedIdMap.get(recipe.recipeId) ?? null;
    }
    if (savingIds.has(recipe.recipeId)) return null;

    setSavedIds((prev) => new Set(prev).add(recipe.recipeId));
    if (opts.showToast !== false) {
      showToast("Recipe saved!", {
        duration: 5000,
        action: {
          label: "Add to meal plan",
          onClick: () => router.push("/recipes?tab=meal-plan"),
        },
      });
    }

    // Optimistically inject a placeholder into the My Recipes SWR cache so
    // /recipes reflects the save instantly. Swapped for the real row when
    // /save returns; reverted on failure.
    const placeholder: Recipe = {
      id: recipe.recipeId,
      user_id: "",
      title: recipe.title,
      source_url: recipe.source_url ?? null,
      source_platform: null,
      description: recipe.description ?? null,
      ingredients: [],
      steps: [],
      servings: recipe.servings ?? null,
      prep_time_minutes: recipe.prep_time_minutes ?? null,
      cook_time_minutes: recipe.cook_time_minutes ?? null,
      tags: recipe.tags ?? [],
      meal_type: (recipe.meal_type as Recipe["meal_type"]) || "dinner",
      image_url: recipe.image_url ?? null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    swrMutate(
      "supabase:recipes",
      (current: Recipe[] | undefined) => {
        const list = current ?? [];
        if (list.some((row) => row.id === recipe.recipeId)) return list;
        return [placeholder, ...list];
      },
      false,
    );

    setSavingIds((prev) => new Set(prev).add(recipe.recipeId));
    try {
      const detailRes = await fetch(`/api/recipes/${recipe.recipeId}`);
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
          calories: r.calories,
          protein_g: r.protein_g,
          carbs_g: r.carbs_g,
          fat_g: r.fat_g,
          fiber_g: r.fiber_g,
          notes: "Saved from Discover",
        }),
      });
      let savedId: string | null = null;
      let savedRecipe: Recipe | null = null;
      if (res.ok) {
        const data = await res.json();
        savedRecipe = (data.recipe as Recipe) ?? null;
        savedId = savedRecipe?.id ?? null;
      } else {
        const errData = await res.json();
        if (errData.duplicate && errData.recipeId) {
          savedId = errData.recipeId;
        } else {
          throw new Error(errData.error || "Failed to save");
        }
      }
      if (savedId) {
        setSavedIdMap((m) => new Map(m).set(recipe.recipeId, savedId!));
      }
      // Swap the placeholder for the real saved row. On 409 the canonical row
      // is already in the user's library — just remove the placeholder and
      // trigger a revalidation so SWR picks it up.
      if (savedRecipe) {
        const realRow = savedRecipe;
        swrMutate(
          "supabase:recipes",
          (current: Recipe[] | undefined) => {
            const list = (current ?? []).filter((row) => row.id !== recipe.recipeId);
            if (list.some((row) => row.id === realRow.id)) return list;
            return [realRow, ...list];
          },
          false,
        );
      } else {
        swrMutate(
          "supabase:recipes",
          (current: Recipe[] | undefined) =>
            (current ?? []).filter((row) => row.id !== recipe.recipeId),
          false,
        );
        swrMutate("supabase:recipes");
      }
      return savedId;
    } catch (err) {
      console.error("[Discover] community save failed:", err);
      setSavedIds((prev) => {
        const n = new Set(prev);
        n.delete(recipe.recipeId);
        return n;
      });
      // Revert the optimistic placeholder.
      swrMutate(
        "supabase:recipes",
        (current: Recipe[] | undefined) =>
          (current ?? []).filter((row) => row.id !== recipe.recipeId),
        false,
      );
      showToast("Failed to save recipe");
      return null;
    } finally {
      setSavingIds((prev) => {
        const n = new Set(prev);
        n.delete(recipe.recipeId);
        return n;
      });
    }
  }

  function handleSave(recipe: TrendingRecipe) {
    void saveRecipe(recipe);
  }

  async function handleSaveToCollection(recipe: TrendingRecipe) {
    if (!onAddToCollection) return;
    // Suppress the standard "Recipe saved!" toast — the collection modal is
    // its own feedback. Reuse the cached saved-id when available.
    const cached = savedIdMap.get(recipe.recipeId);
    const id = cached ?? (await saveRecipe(recipe, { showToast: false }));
    if (id) onAddToCollection(id);
  }

  return (
    <div>
      {/* Section header with the tomato flourish divider */}
      <header className="mb-6 sm:mb-8">
        <p className="marco-mono mb-2">What&apos;s cooking</p>
        <h2
          className="mb-3"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600',
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "var(--ink, #1C1A17)",
          }}
        >
          This week&apos;s table.
        </h2>
        <TomatoFlourish variant="divider" />
      </header>

      {isLoading && trending.length === 0 ? (
        <div className="py-12 text-center">
          <p className="marco-mono">Loading…</p>
        </div>
      ) : trending.length === 0 ? (
        <div className="py-16 text-center">
          <p
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
              fontSize: "17px",
              color: "var(--ink-soft, #4A4742)",
            }}
          >
            nothing trending right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {trending.map((recipe, i) => {
            const isSaved = savedIds.has(recipe.recipeId);
            const isSaving = savingIds.has(recipe.recipeId);
            const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

            return (
              <div
                key={recipe.recipeId}
                onContextMenu={onContextMenu(recipe.recipeId, recipe.title)}
                onTouchStart={onLongPress(recipe.recipeId, recipe.title)}
                onTouchEnd={onLongPressCancel}
                onTouchMove={onLongPressCancel}
              >
                <SharedRecipeCard
                  title={recipe.title}
                  imageUrl={recipe.image_url}
                  mealType={recipe.meal_type}
                  totalTime={totalTime}
                  index={i}
                  onClick={() => onTap(recipe.recipeId)}
                  actions={[
                    ...(onAddToCollection
                      ? [{
                          icon: (
                            <svg
                              className="w-3.5 h-3.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                              />
                            </svg>
                          ),
                          onClick: () => handleSaveToCollection(recipe),
                          label: "Save to collection",
                        }]
                      : []),
                    {
                      icon: (
                        <svg
                          className="w-3.5 h-3.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      ),
                      onClick: () => handleSave(recipe),
                      label: isSaved ? "Saved" : "Save recipe",
                      active: isSaved,
                      loading: isSaving,
                    },
                  ]}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
