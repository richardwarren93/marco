"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import DiscoverRecipeCard from "@/components/recipes/discover/DiscoverRecipeCard";
import { useDiscoverSave } from "@/components/recipes/discover/useDiscoverSave";
import KitchenSurface from "@/components/layout/KitchenSurface";
import { DISPLAY, INK, INK_SOFT, PAPER } from "@/lib/theme";

interface FriendRecipe {
  id: string;
  title: string;
  image_url: string | null;
  meal_type: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  tags?: string[];
}
interface FriendProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}
interface FriendActivity {
  recipes: FriendRecipe[];
  friends: FriendProfile[];
}


function initials(name: string): string {
  return (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function FriendRecipesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const friendId = params.id;
  const { savedIds, savingIds, handleSave } = useDiscoverSave();

  const { data, isLoading } = useSWR<FriendActivity>(
    friendId ? `/api/recipes/friends-activity?friend=${friendId}` : null,
    apiFetcher,
    { revalidateOnFocus: false },
  );

  const recipes = data?.recipes ?? [];
  const friend = data?.friends?.[0] ?? null;
  const name = friend?.display_name || "Friend";

  return (
    <KitchenSurface>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 pb-2 max-w-2xl mx-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span
          className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
          style={{ width: 36, height: 36, background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, border: `2px solid ${INK}` }}
        >
          {friend?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={friend.avatar_url} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        <div className="min-w-0">
          <h1 className="truncate" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 21, letterSpacing: "-0.02em" }}>{name}&apos;s recipes</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-52 skeleton-warm" style={{ borderRadius: 16, border: `2.5px solid ${INK}` }} />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16 px-6" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <p className="text-[14px]" style={{ color: INK_SOFT }}>{name} hasn&apos;t saved any recipes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((r, i) => (
              <DiscoverRecipeCard
                key={r.id}
                index={i}
                recipe={{
                  recipeId: r.id,
                  title: r.title,
                  image_url: r.image_url,
                  meal_type: r.meal_type ?? "",
                  totalTime: (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0),
                  rating: { average: 0, count: 0 },
                }}
                savedByName={name}
                savedByAvatar={friend?.avatar_url ?? null}
                onTap={() => router.push(`/recipes/${r.id}`)}
                onSave={() => handleSave({
                  recipeId: r.id,
                  title: r.title,
                  image_url: r.image_url,
                  meal_type: r.meal_type ?? "",
                  prep_time_minutes: r.prep_time_minutes,
                  cook_time_minutes: r.cook_time_minutes,
                  tags: r.tags ?? [],
                })}
                isSaved={savedIds.has(r.id)}
                isSaving={savingIds.has(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </KitchenSurface>
  );
}
