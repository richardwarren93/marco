"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import SignedRecipeCard, { type FriendsFeedItem } from "./SignedRecipeCard";
import FriendsEmptyState from "./FriendsEmptyState";

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
  onLongPress: (recipeId: string, title: string) => (e: React.TouchEvent) => void;
  onLongPressCancel: () => void;
  onContextMenu: (recipeId: string, title: string) => (e: React.MouseEvent) => void;
  onSwitchToCommunity?: () => void;
}

export default function FriendsFeed({
  onTap,
  onLongPress,
  onLongPressCancel,
  onContextMenu,
  onSwitchToCommunity,
}: Props) {
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

  if (loading && items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="marco-mono">Loading…</p>
      </div>
    );
  }

  if (!hasFriends) {
    return <FriendsEmptyState hasFriends={false} />;
  }

  if (items.length === 0) {
    return (
      <FriendsEmptyState hasFriends={true} onSwitchToCommunity={onSwitchToCommunity} />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {items.map((item, i) => (
        <SignedRecipeCard
          key={item.id}
          item={item}
          index={i}
          onTap={onTap}
          onLongPress={onLongPress}
          onLongPressCancel={onLongPressCancel}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
