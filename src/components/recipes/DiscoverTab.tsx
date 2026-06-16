"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  recommended: DiscoverItem[];
  trending: DiscoverItem[];
  categories: { key: string; label: string; count: number }[];
  results: DiscoverItem[] | null;
}

const INK = "#1C1A17";
const ACCENT = "#E5462E";

// ─── Category icons ──────────────────────────────────────────────────────────
function CategoryIcon({ k }: { k: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", className: "w-5 h-5" };
  switch (k) {
    case "quick": return (<svg {...common}><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" /></svg>);
    case "dinner": return (<svg {...common}><path d="M3 3v7a3 3 0 003 3v8M7 3v6M5 3v6M16 3c-1.5 1.5-2 4-2 7s.5 5.5 2 7V3z" /></svg>);
    case "vegetarian": return (<svg {...common}><path d="M11 20A7 7 0 014 13c0-5 4-9 9-9 5 0 7 3 7 3-2 9-9 13-9 13zM11 20c0-4 2-7 5-9" /></svg>);
    case "comfort": return (<svg {...common}><path d="M4 11h16a8 8 0 01-16 0zM2 11h20M8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5" /></svg>);
    case "low_carb": return (<svg {...common}><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v4l3 2" /></svg>);
    case "breakfast": return (<svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>);
    case "dessert": return (<svg {...common}><path d="M6 11h12l-1.5 9h-9L6 11zM8 11a4 4 0 018 0M12 5v2" /></svg>);
    default: return (<svg {...common}><path d="M7 7h.01M7 3h5a2 2 0 011.4.6l7 7a2 2 0 010 2.8l-5 5a2 2 0 01-2.8 0l-7-7A2 2 0 015 12V7a4 4 0 014-4z" /></svg>);
  }
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, expanded, onToggle }: { title: string; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3 px-0.5">
      <h2 style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 17, letterSpacing: "-0.01em", color: INK }}>
        {title}
      </h2>
      <button onClick={onToggle} className="flex items-center gap-0.5 text-[12.5px] font-semibold active:scale-95" style={{ color: "#8a847a" }}>
        {expanded ? "Show less" : "See all"}
        <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandRecommended, setExpandRecommended] = useState(false);
  const [expandTrending, setExpandTrending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = new URLSearchParams();
  if (debouncedQ) params.set("q", debouncedQ);
  if (filters.mealTypes.length) params.set("meal_type", filters.mealTypes.join(","));
  if (filters.dietary.length) params.set("dietary", filters.dietary.join(","));
  if (filters.maxTime) params.set("max_time", String(filters.maxTime));
  if (activeCategory) params.set("category", activeCategory);
  const swrKey = `/api/recipes/discover?${params.toString()}`;

  const { data, isLoading } = useSWR<DiscoverResponse>(swrKey, apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
    keepPreviousData: true,
  });

  // Safe locals — the API may return an error shape (e.g. 401 / transient
  // failure) where the section arrays are absent, so never reach into them
  // without a fallback.
  const ok = !!data && Array.isArray((data as DiscoverResponse).recommended);
  const recommended = ok ? data!.recommended : [];
  const trending = ok ? data!.trending : [];
  const categories = ok ? data!.categories : [];
  const results = ok ? data!.results : null;
  const total = ok ? data!.total : 0;
  const totalFiltered = ok ? data!.totalFiltered : 0;

  const filterCount = activeFilterCount(filters);
  const isFiltering = !!(debouncedQ || filterCount || activeCategory);

  const handleTap = useCallback((recipeId: string) => router.push(`/recipes/${recipeId}`), [router]);

  const clearAll = () => {
    setSearchInput("");
    setDebouncedQ("");
    setFilters({ mealTypes: [], dietary: [], maxTime: 0 });
    setActiveCategory(null);
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

  const renderHScroll = (items: DiscoverItem[]) => (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
      {items.map((item, i) => (
        <div key={item.recipeId} className="shrink-0" style={{ width: 156, scrollSnapAlign: "start" }}>
          {renderCard(item, i)}
        </div>
      ))}
    </div>
  );

  const renderGrid = (items: DiscoverItem[]) => (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => renderCard(item, i))}
    </div>
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
            <p className="text-[13px] font-semibold" style={{ color: "#6B655C" }}>
              {ok ? `${totalFiltered} ${totalFiltered === 1 ? "recipe" : "recipes"}` : "Searching…"}
            </p>
            <button onClick={clearAll} className="text-[12.5px] font-semibold" style={{ color: ACCENT }}>Clear</button>
          </div>
          {results && results.length > 0 ? (
            renderGrid(results)
          ) : !isLoading ? (
            <div className="py-16 text-center">
              <p style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontStyle: "italic", fontSize: 17, color: "#6B655C" }}>
                Nothing matches those filters.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {/* ── Recommended ───────────────────────────────────── */}
          {recommended.length > 0 && (
            <section className="mb-7">
              <SectionHeader title="Recommended for you" expanded={expandRecommended} onToggle={() => setExpandRecommended((v) => !v)} />
              {expandRecommended ? renderGrid(recommended) : renderHScroll(recommended)}
            </section>
          )}

          {/* ── Trending ──────────────────────────────────────── */}
          {trending.length > 0 && (
            <section className="mb-7">
              <SectionHeader title="Trending this week" expanded={expandTrending} onToggle={() => setExpandTrending((v) => !v)} />
              {expandTrending ? renderGrid(trending) : renderHScroll(trending)}
            </section>
          )}

          {/* ── Browse by category ────────────────────────────── */}
          {categories.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-3 px-0.5" style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 17, letterSpacing: "-0.01em", color: INK }}>
                Browse by category
              </h2>
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setActiveCategory(c.key)}
                    className="shrink-0 flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl active:scale-95 transition-transform"
                    style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.06)", width: 92 }}
                  >
                    <span className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "var(--cream-warm, #EFE5D2)", color: ACCENT }}>
                      <CategoryIcon k={c.key} />
                    </span>
                    <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: INK }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Loading / empty */}
          {isLoading && !ok && (
            <div className="py-16 text-center">
              <p className="marco-mono" style={{ color: "#8a847a" }}>Loading…</p>
            </div>
          )}
          {ok && total === 0 && (
            <div className="py-16 text-center">
              <p style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontStyle: "italic", fontSize: 17, color: "#6B655C" }}>
                Nothing to discover just yet — check back soon.
              </p>
            </div>
          )}
        </>
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
