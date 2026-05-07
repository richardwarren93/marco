"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as swrMutate } from "swr";
import type { Recipe } from "@/types";
import { apiFetcher } from "@/lib/hooks/use-data";
import SignedRecipeCard, { type FriendsFeedItem } from "./SignedRecipeCard";
import FriendsEmptyState from "./FriendsEmptyState";
import TomatoFlourish from "@/components/brand/TomatoFlourish";
import { useToast } from "@/components/ui/Toast";

/**
 * Friends-feed surface. Merges two endpoints into a single timeline of
 * "what your friends are doing":
 *
 *   - /api/recipes/friends-activity — saves + planning entries
 *   - /api/activity-feed             — cook photos (only items with image_url)
 *
 * Each recipe can show up to twice: once for its save/plan state and once
 * for the cook photo. They're distinct moments.
 */

interface FriendsActivityResponse {
  recipes: Array<{
    id: string;
    user_id: string;
    title: string;
    image_url: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    meal_type: string | null;
    created_at: string;
    owner_name: string;
    owner_avatar: string | null;
    is_planned: boolean;
    next_planned_date: string | null;
    planning_friends: { name: string; avatar: string | null }[];
  }>;
  friends: Array<{ user_id: string; display_name: string; avatar_url: string | null }>;
}

interface ActivityFeedResponse {
  items: Array<{
    id: string;
    user_id: string;
    activity_type: string;
    recipe_id: string | null;
    image_url: string | null;
    caption: string | null;
    created_at: string;
    profile: { display_name: string; avatar_url: string | null } | null;
    recipe: {
      id: string;
      title: string;
      image_url: string | null;
      tags: string[];
      description: string | null;
    } | null;
  }>;
  hasMore: boolean;
}

interface Props {
  onTap: (recipeId: string) => void;
  onSwitchToCommunity?: () => void;
  /** Open the AddToCollectionModal with the user's saved copy of the recipe. */
  onAddToCollection?: (savedRecipeId: string) => void;
}

export default function FriendsFeed({
  onTap,
  onSwitchToCommunity,
  onAddToCollection,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIdMap, setSavedIdMap] = useState<Map<string, string>>(new Map());

  async function saveRecipe(item: FriendsFeedItem, opts: { showToast?: boolean } = {}): Promise<string | null> {
    const recipeId = item.recipeId;
    if (savedIds.has(recipeId)) return savedIdMap.get(recipeId) ?? null;
    if (savingIds.has(recipeId)) return null;

    setSavedIds((prev) => new Set(prev).add(recipeId));
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
    // /recipes reflects the save instantly. Use the FriendsFeedItem fields we
    // already have on screen — swapped for the real row when /save returns.
    const placeholder: Recipe = {
      id: recipeId,
      user_id: "",
      title: item.title,
      source_url: null,
      source_platform: null,
      description: null,
      ingredients: [],
      steps: [],
      servings: null,
      prep_time_minutes: item.prepMinutes ?? null,
      cook_time_minutes: item.cookMinutes ?? null,
      tags: [],
      meal_type: (item.mealType as Recipe["meal_type"]) || "dinner",
      image_url: item.imageUrl,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    swrMutate(
      "supabase:recipes",
      (current: Recipe[] | undefined) => {
        const list = current ?? [];
        if (list.some((row) => row.id === recipeId)) return list;
        return [placeholder, ...list];
      },
      false,
    );

    setSavingIds((prev) => new Set(prev).add(recipeId));
    try {
      const detailRes = await fetch(`/api/recipes/${recipeId}`);
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
          notes: "Saved from a friend's feed",
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
        setSavedIdMap((m) => new Map(m).set(recipeId, savedId!));
      }
      if (savedRecipe) {
        const realRow = savedRecipe;
        swrMutate(
          "supabase:recipes",
          (current: Recipe[] | undefined) => {
            const list = (current ?? []).filter((row) => row.id !== recipeId);
            if (list.some((row) => row.id === realRow.id)) return list;
            return [realRow, ...list];
          },
          false,
        );
      } else {
        swrMutate(
          "supabase:recipes",
          (current: Recipe[] | undefined) =>
            (current ?? []).filter((row) => row.id !== recipeId),
          false,
        );
        swrMutate("supabase:recipes");
      }
      return savedId;
    } catch (err) {
      console.error("[Discover] friends save failed:", err);
      setSavedIds((prev) => {
        const n = new Set(prev);
        n.delete(recipeId);
        return n;
      });
      swrMutate(
        "supabase:recipes",
        (current: Recipe[] | undefined) =>
          (current ?? []).filter((row) => row.id !== recipeId),
        false,
      );
      showToast("Failed to save recipe");
      return null;
    } finally {
      setSavingIds((prev) => {
        const n = new Set(prev);
        n.delete(recipeId);
        return n;
      });
    }
  }

  function handleSave(item: FriendsFeedItem) {
    void saveRecipe(item);
  }

  async function handleSaveToCollection(item: FriendsFeedItem) {
    if (!onAddToCollection) return;
    const cached = savedIdMap.get(item.recipeId);
    const id = cached ?? (await saveRecipe(item, { showToast: false }));
    if (id) onAddToCollection(id);
  }
  const { data: friendsData, isLoading: friendsLoading } = useSWR<FriendsActivityResponse>(
    "/api/recipes/friends-activity",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const { data: activityData, isLoading: activityLoading } = useSWR<ActivityFeedResponse>(
    "/api/activity-feed?offset=0&limit=20",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const items: FriendsFeedItem[] = useMemo(() => {
    const out: FriendsFeedItem[] = [];

    // 1. Friends-activity: saves + planned
    for (const r of friendsData?.recipes ?? []) {
      out.push({
        id: `${r.is_planned ? "plan" : "save"}-${r.id}-${r.user_id}`,
        kind: r.is_planned ? "planned" : "saved",
        recipeId: r.id,
        title: r.title,
        imageUrl: r.image_url,
        ownerName: r.owner_name,
        ownerAvatar: r.owner_avatar,
        prepMinutes: r.prep_time_minutes,
        cookMinutes: r.cook_time_minutes,
        mealType: r.meal_type,
        createdAt: r.created_at,
        plannedDate: r.next_planned_date,
        planningFriends: r.planning_friends,
      });
    }

    // 2. Activity-feed: only items with a cook photo (image_url)
    for (const a of activityData?.items ?? []) {
      if (!a.image_url || !a.recipe) continue;
      out.push({
        id: `made-${a.id}`,
        kind: "made",
        recipeId: a.recipe.id,
        title: a.recipe.title,
        imageUrl: a.image_url, // the cook photo, not the recipe stock image
        ownerName: a.profile?.display_name ?? "A friend",
        ownerAvatar: a.profile?.avatar_url ?? null,
        prepMinutes: null,
        cookMinutes: null,
        mealType: null,
        createdAt: a.created_at,
        caption: a.caption,
      });
    }

    // Sort: upcoming planned first (asc by date), then recent activity desc.
    return out.sort((a, b) => {
      if (a.kind === "planned" && b.kind !== "planned") return -1;
      if (a.kind !== "planned" && b.kind === "planned") return 1;
      if (a.kind === "planned" && b.kind === "planned") {
        return (a.plannedDate ?? "").localeCompare(b.plannedDate ?? "");
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [friendsData, activityData]);

  const loading = friendsLoading || activityLoading;
  const hasFriends = (friendsData?.friends?.length ?? 0) > 0;

  return (
    <div>
      {/* Same editorial header as Community — eyebrow + Fraunces title +
          tomato flourish — so both views feel like one surface, just
          different rooms. */}
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

      {loading && items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="marco-mono">Loading…</p>
        </div>
      ) : !hasFriends ? (
        <FriendsEmptyState hasFriends={false} />
      ) : items.length === 0 ? (
        <FriendsEmptyState hasFriends={true} onSwitchToCommunity={onSwitchToCommunity} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((item, i) => {
        const isSaved = savedIds.has(item.recipeId);
        const isSaving = savingIds.has(item.recipeId);
        const actions = [
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
                onClick: () => handleSaveToCollection(item),
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
            onClick: () => handleSave(item),
            label: isSaved ? "Saved" : "Save recipe",
            active: isSaved,
            loading: isSaving,
          },
        ];
        return (
          <SignedRecipeCard
            key={item.id}
            item={item}
            index={i}
            onTap={onTap}
            actions={actions}
          />
        );
      })}
        </div>
      )}
    </div>
  );
}
