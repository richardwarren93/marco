"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import DiscoverRecipeCard, { type DiscoverCardData } from "./discover/DiscoverRecipeCard";
import DiscoverFilterSheet, { type DiscoverFilters, activeFilterCount } from "./discover/DiscoverFilterSheet";
import { useDiscoverSave } from "./discover/useDiscoverSave";

interface DiscoverItem extends DiscoverCardData {
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  tags: string[];
  saveCount: number;
  userCount: number;
}

interface DiscoverResponse {
  total: number;
  totalFiltered: number;
  results: DiscoverItem[] | null;
}

// Friends' Favorites — recipes owned/saved by the user's accepted friends.
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

interface FriendsResponse {
  recipes: FriendRecipe[];
  friends: { user_id: string; display_name: string; avatar_url: string | null }[];
}

const INK = "#1C1A17";
const ACCENT = "#E5462E";

export default function DiscoverTab({
  onAddToCollection,
}: {
  onAddToMealPlan?: (recipeId: string) => void;
  onAddToCollection?: (recipeId: string) => void;
}) {
  const router = useRouter();
  const { savedIds, savingIds, handleSave, handleSaveToCollection } = useDiscoverSave(onAddToCollection);

  // Filter + search state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filters, setFilters] = useState<DiscoverFilters>({ mealTypes: [], dietary: [], maxTime: 0 });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filterCount = activeFilterCount(filters);
  const isFiltering = !!(debouncedQ || filterCount);

  // ── Friends' Favorites (default view) ──────────────────────────
  const { data: friendsData, isLoading: friendsLoading } = useSWR<FriendsResponse>(
    "/api/recipes/friends-activity",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );
  const friendRecipes = Array.isArray(friendsData?.recipes) ? friendsData!.recipes : [];

  // ── Catalog search (only fetched when searching / filtering) ───
  const params = new URLSearchParams();
  if (debouncedQ) params.set("q", debouncedQ);
  if (filters.mealTypes.length) params.set("meal_type", filters.mealTypes.join(","));
  if (filters.dietary.length) params.set("dietary", filters.dietary.join(","));
  if (filters.maxTime) params.set("max_time", String(filters.maxTime));
  const catalogKey = isFiltering || sheetOpen ? `/api/recipes/discover?${params.toString()}` : null;

  const { data: catalogData, isLoading: catalogLoading } = useSWR<DiscoverResponse>(
    catalogKey,
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 15000, keepPreviousData: true },
  );

  const ok = !!catalogData && Array.isArray((catalogData as DiscoverResponse).results);
  const results = ok ? catalogData!.results : null;
  const totalFiltered = ok ? catalogData!.totalFiltered : 0;

  const handleTap = useCallback((recipeId: string) => router.push(`/recipes/${recipeId}`), [router]);

  const clearAll = () => {
    setSearchInput("");
    setDebouncedQ("");
    setFilters({ mealTypes: [], dietary: [], maxTime: 0 });
  };

  const renderCard = (item: DiscoverItem, i: number) => (
    <DiscoverRecipeCard
      key={item.recipeId}
      recipe={item}
      index={i}
      onTap={() => handleTap(item.recipeId)}
      onSave={() => handleSave({ recipeId: item.recipeId, title: item.title, image_url: item.image_url, meal_type: item.meal_type, prep_time_minutes: item.prep_time_minutes, cook_time_minutes: item.cook_time_minutes, tags: item.tags })}
      onAddToCollection={onAddToCollection ? () => handleSaveToCollection({ recipeId: item.recipeId, title: item.title, image_url: item.image_url, meal_type: item.meal_type, prep_time_minutes: item.prep_time_minutes, cook_time_minutes: item.cook_time_minutes, tags: item.tags }) : undefined}
      isSaved={savedIds.has(item.recipeId)}
      isSaving={savingIds.has(item.recipeId)}
    />
  );

  const renderFriendCard = (r: FriendRecipe, i: number) => {
    const saveable = {
      recipeId: r.id,
      title: r.title,
      image_url: r.image_url,
      meal_type: r.meal_type ?? "",
      prep_time_minutes: r.prep_time_minutes,
      cook_time_minutes: r.cook_time_minutes,
      tags: r.tags ?? [],
    };
    return (
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
        savedByName={r.owner_name}
        savedByAvatar={r.owner_avatar}
        onTap={() => handleTap(r.id)}
        onSave={() => handleSave(saveable)}
        onAddToCollection={onAddToCollection ? () => handleSaveToCollection(saveable) : undefined}
        isSaved={savedIds.has(r.id)}
        isSaving={savingIds.has(r.id)}
      />
    );
  };

  const renderGrid = (items: DiscoverItem[]) => (
    <div className="grid grid-cols-2 gap-3">{items.map((item, i) => renderCard(item, i))}</div>
  );

  return (
    <div
      className="max-w-2xl mx-auto px-4 pt-3"
      style={{ background: "var(--cream, #F5EEE2)", paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}
    >
      {/* ── Search + filter ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 flex items-center gap-2 rounded-full px-3.5 h-11" style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.06)" }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#a8a29a" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search recipes, ingredients, tags…"
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: INK }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput("")} aria-label="Clear search" className="flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#a8a29a" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Filters"
          className="relative w-11 h-11 flex items-center justify-center rounded-full active:scale-95 transition-transform"
          style={{ background: filterCount > 0 ? ACCENT : "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.06)" }}
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke={filterCount > 0 ? "#fff" : INK} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          {filterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: INK }}>
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Filtered results ────────────────────────────────────── */}
      {isFiltering ? (
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <p className="text-[13px] font-semibold" style={{ color: "var(--ink-soft, #4A4742)" }}>
              {ok ? `${totalFiltered} ${totalFiltered === 1 ? "recipe" : "recipes"}` : "Searching…"}
            </p>
            <button onClick={clearAll} className="text-[12.5px] font-semibold" style={{ color: ACCENT }}>Clear</button>
          </div>
          {results && results.length > 0 ? (
            renderGrid(results)
          ) : !catalogLoading ? (
            <div className="py-16 text-center">
              <p style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontStyle: "italic", fontSize: 17, color: "var(--ink-soft, #4A4742)" }}>
                Nothing matches those filters.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        /* ── Friends' Favorites (default) ──────────────────────── */
        <section>
          <div className="flex items-center justify-between mb-4 px-0.5">
            <h2 style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 22, letterSpacing: "-0.015em", color: INK }}>
              Friends&apos; Favorites
            </h2>
            <Link href="/friends" className="flex items-center gap-0.5 text-[12.5px] font-semibold active:scale-95" style={{ color: "var(--ink-soft, #4A4742)" }}>
              Friends
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {friendRecipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {friendRecipes.map((r, i) => renderFriendCard(r, i))}
            </div>
          ) : friendsLoading ? (
            <div className="py-16 text-center">
              <p className="marco-mono" style={{ color: "var(--ink-soft, #4A4742)" }}>Loading…</p>
            </div>
          ) : (
            <div className="py-14 px-6 text-center">
              <div
                className="mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{ width: 56, height: 56, background: "var(--cream-warm, #EFE5D2)", color: ACCENT }}
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <p style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontWeight: 600, fontSize: 18, color: INK }}>
                No friends&apos; favorites yet
              </p>
              <p className="mt-1.5 mb-5 text-[13.5px]" style={{ color: "var(--ink-soft, #4A4742)" }}>
                Add friends to see the recipes they&apos;re saving and cooking.
              </p>
              <Link
                href="/friends"
                className="inline-block px-5 py-3 rounded-2xl font-semibold text-[14px] text-white active:scale-95 transition-transform"
                style={{ background: ACCENT }}
              >
                Find friends
              </Link>
            </div>
          )}
        </section>
      )}

      <DiscoverFilterSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={filters}
        onChange={setFilters}
        totalFiltered={totalFiltered}
      />
    </div>
  );
}
