"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import DiscoverRecipeCard from "@/components/recipes/discover/DiscoverRecipeCard";
import { useDiscoverSave } from "@/components/recipes/discover/useDiscoverSave";

/* "What your friends are cooking" — a horizontal row of the SAME cards used on
   the Discover (Explore) tab, fed by the same friends-activity feed. "See all"
   jumps to the Discover tab. Renders nothing when there are no friend recipes. */

interface FriendRecipe {
  id: string;
  title: string;
  image_url: string | null;
  meal_type: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  tags?: string[];
  owner_name: string;
  owner_avatar: string | null;
}

const INK = "#1C1A17";

export default function FriendsCookingRow() {
  const router = useRouter();
  const { savedIds, savingIds, handleSave } = useDiscoverSave();

  const { data } = useSWR<{ recipes: FriendRecipe[] }>(
    "/api/recipes/friends-activity",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  const recipes = Array.isArray(data?.recipes) ? data!.recipes : [];
  if (recipes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold" style={{ color: INK }}>
          What your friends are cooking
        </h2>
        <Link
          href="/recipes?tab=discover"
          className="flex items-center gap-0.5 text-[12.5px] font-semibold active:scale-95"
          style={{ color: "var(--ink-soft, #4A4742)" }}
        >
          See all
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1" style={{ scrollSnapType: "x mandatory" }}>
        {recipes.slice(0, 12).map((r, i) => (
          <div key={r.id} className="shrink-0" style={{ width: 190, scrollSnapAlign: "start" }}>
            <DiscoverRecipeCard
              index={i}
              recipe={{
                recipeId: r.id,
                title: r.title,
                image_url: r.image_url,
                meal_type: r.meal_type ?? "",
                totalTime: (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0),
                rating: { average: 0, count: 0 },
              }}
              savedByName={r.owner_name}
              savedByAvatar={r.owner_avatar}
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
          </div>
        ))}
      </div>
    </div>
  );
}
