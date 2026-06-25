"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import DiscoverRecipeCard from "@/components/recipes/discover/DiscoverRecipeCard";
import { useDiscoverSave } from "@/components/recipes/discover/useDiscoverSave";

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

const INK = "#1C1A17";
const INK_SOFT = "#4A4742";

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
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
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
          style={{ width: 36, height: 36, background: "linear-gradient(135deg,#E8A33D,#E5462E)", color: "#fff", fontWeight: 700, fontSize: 12 }}
        >
          {friend?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={friend.avatar_url} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl marco-h1 truncate" style={{ color: INK }}>{name}&apos;s recipes</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-2" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-52 skeleton-warm rounded-2xl" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.05)" }}>
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
    </div>
  );
}
