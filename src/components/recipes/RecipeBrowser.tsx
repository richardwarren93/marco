"use client";

import { useState, useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Recipe, Collection } from "@/types";
import { recipeMatchesQuery } from "@/lib/recipeSearch";
import SharedRecipeCard from "./SharedRecipeCard";
import RecipeFilterSheet, { type RecipeFilters, recipeFilterCount } from "./RecipeFilterSheet";
import { CollectionsIcon, SearchIcon } from "@/components/icons/HandDrawnIcons";
import { MealIcon } from "@/components/icons/MealIcons";

const INK = "#1C1A17";
const ACCENT = "#E5462E";

// How many recipes the "Recently added" preview shows before "View all".
const RECENT_LIMIT = 4;

// Section heading — Marker Felt display, the app's beautiful-chaos voice.
const SECTION_HEADING: CSSProperties = {
  fontFamily: '"Marker Felt", Georgia, serif',
  fontWeight: 700,
  fontSize: "20px",
  letterSpacing: "-0.01em",
  color: "#171410",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type LibraryMode = {
  mode: "library";
  recipes: Recipe[];
  loading?: boolean;
  /** Called when user taps "+" on a card — parent opens AddMealSheet */
  onAddToMealPlan?: (recipeId: string) => void;
  /** Called when user taps bookmark on a card — parent opens AddToCollectionModal */
  onAddToCollection?: (recipeId: string) => void;
  /** Set of recipe IDs that are in at least one collection */
  inCollectionIds?: Set<string>;
  /** Called after a collection change to refresh the inCollectionIds */
  onCollectionChanged?: () => void;
  /** Collections to surface in the bottom section */
  collections?: Collection[];
};

type PickMode = {
  mode: "pick";
  recipes: Recipe[];
  onPick: (id: string) => Promise<void>;
  onBack: () => void;
};

export type RecipeBrowserProps = LibraryMode | PickMode;

// ─── Recipe card ──────────────────────────────────────────────────────────────

function BrowserCard({
  recipe,
  mode,
  onAdd,
  onCollection,
  isInCollection,
  onPick,
  isPicking,
  index = 0,
  aspect,
}: {
  recipe: Recipe;
  mode: "library" | "pick";
  onAdd?: () => void;
  onCollection?: () => void;
  isInCollection?: boolean;
  onPick?: () => void;
  isPicking?: boolean;
  index?: number;
  aspect?: string;
}) {
  const router = useRouter();
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  function handleCardClick() {
    if (mode === "pick") {
      onPick?.();
    } else {
      router.push(`/recipes/${recipe.id}`);
    }
  }

  const actions = mode === "library"
    ? [
        ...(onCollection
          ? [{
              icon: (
                <svg className="w-3.5 h-3.5 text-white" fill={isInCollection ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              ),
              onClick: onCollection,
              label: isInCollection ? "In collection" : "Add to collection",
            }]
          : []),
        ...(onAdd
          ? [{
              icon: (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              ),
              onClick: onAdd,
              label: "Add to meal plan",
            }]
          : []),
      ]
    : [];

  return (
    <SharedRecipeCard
      title={recipe.title}
      imageUrl={recipe.image_url}
      mealType={recipe.meal_type}
      totalTime={totalTime}
      onClick={handleCardClick}
      actions={actions}
      topLeftBadge={
        mode === "pick" && isPicking ? (
          <div className="w-7 h-7 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-md">
            <div className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : undefined
      }
      index={index}
      aspect={aspect}
    />
  );
}

function Chip({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform" style={{ padding: "7px 13px", borderRadius: 99, border: `2px solid #171410`, background: active ? "#171410" : "#FBF7EE", color: active ? "#FBF7EE" : "#171410", fontFamily: '"Marker Felt", Georgia, serif', fontWeight: 700, fontSize: "13.5px", whiteSpace: "nowrap" }}>
      {color && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 99, background: color, flexShrink: 0 }} />}
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecipeBrowser(props: RecipeBrowserProps) {
  const { recipes } = props;

  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<RecipeFilters>({ sort: "newest", mealTypes: [] });
  const [sheetOpen, setSheetOpen] = useState(false);
  // "Recently added" preview vs. expanded full list
  const [showAll, setShowAll] = useState(false);

  // Pick mode: which card is mid-selection
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // Beli-style auto-collections — derived from recipe metadata (time, meal,
  // tags), no manual sorting needed. A chip appears once a bucket has enough.
  const [chip, setChip] = useState<string | null>(null);
  const autoCollections = useMemo(() => {
    const mins = (r: Recipe) => (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
    const COLORS = ["#E5462E", "#C4EE45", "#FFD84D", "#2540E8", "#FF4D9D", "#C9B8FF"];
    let ci = 0; const col = () => COLORS[ci++ % COLORS.length];
    const out: { key: string; label: string; color: string; test: (r: Recipe) => boolean }[] = [];
    if (recipes.filter((r) => { const t = mins(r); return t > 0 && t <= 30; }).length >= 2)
      out.push({ key: "quick", label: "Quick", color: col(), test: (r) => { const t = mins(r); return t > 0 && t <= 30; } });
    (["dinner", "breakfast", "lunch", "snack"] as const).forEach((mt) => {
      if (recipes.filter((r) => (r.meal_type ?? "dinner") === mt).length >= 3)
        out.push({ key: `meal:${mt}`, label: mt[0].toUpperCase() + mt.slice(1), color: col(), test: (r) => (r.meal_type ?? "dinner") === mt });
    });
    const freq = new Map<string, number>();
    recipes.forEach((r) => (r.tags ?? []).forEach((t) => { const k = t.trim().toLowerCase(); if (k && k.length <= 20) freq.set(k, (freq.get(k) ?? 0) + 1); }));
    [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([tag]) => {
      out.push({ key: `tag:${tag}`, label: tag.replace(/\b\w/g, (c) => c.toUpperCase()), color: col(), test: (r) => (r.tags ?? []).some((x) => x.trim().toLowerCase() === tag) });
    });
    return out.slice(0, 10);
  }, [recipes]);

  const filterCount = recipeFilterCount(filters);
  const hasFilters = !!(search.trim() || filters.mealTypes.length > 0 || filters.sort !== "newest" || chip);

  // Filtered recipe list
  const filtered = useMemo(() => {
    let result = recipes;

    if (search.trim()) {
      result = result.filter((r) => recipeMatchesQuery(r, search));
    }
    if (filters.mealTypes.length > 0) {
      result = result.filter((r) => filters.mealTypes.includes(r.meal_type ?? "dinner"));
    }
    if (chip) {
      const col = autoCollections.find((c) => c.key === chip);
      if (col) result = result.filter(col.test);
    }

    if (filters.sort === "prep_time") {
      return [...result].sort((a, b) => {
        const aTime = (a.prep_time_minutes ?? 0) + (a.cook_time_minutes ?? 0);
        const bTime = (b.prep_time_minutes ?? 0) + (b.cook_time_minutes ?? 0);
        if (aTime === 0 && bTime === 0) return 0;
        if (aTime === 0) return 1;
        if (bTime === 0) return -1;
        return aTime - bTime;
      });
    }
    return [...result].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [recipes, search, filters, chip, autoCollections]);

  const displayRecipes = filtered;

  // Sectioned layout (library only, no active filters): show a "Recently
  // added" preview that expands via "View all", plus a Collections section.
  const isLibrary = props.mode === "library";
  const collections = isLibrary ? (props.collections ?? []) : [];
  const showSections = isLibrary && !hasFilters;
  const canExpand = showSections && displayRecipes.length > RECENT_LIMIT;
  const gridRecipes = showSections && !showAll ? displayRecipes.slice(0, RECENT_LIMIT) : displayRecipes;
  const cardAspect = isLibrary ? "1 / 1" : undefined;

  function clearFilters() {
    setSearch("");
    setFilters({ sort: "newest", mealTypes: [] });
  }

  async function handlePick(recipeId: string) {
    if (props.mode !== "pick") return;
    setSelectingId(recipeId);
    try {
      await props.onPick(recipeId);
    } finally {
      setSelectingId(null);
    }
  }

  const isLoading = props.mode === "library" && props.loading;

  return (
    <div className="flex flex-col">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div>
        <div className="max-w-5xl mx-auto">

        {/* Pick mode: back button + title */}
        {props.mode === "pick" && (
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <button
              onClick={props.onBack}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 -ml-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Browse recipes</h1>
          </div>
        )}

        {/* Search + filter — same clean schema as Discover */}
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-full px-3.5 h-11" style={{ background: "#FBF7EE", border: "2px solid #171410" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#a8a29a" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, ingredient, tag…"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: INK }}
                autoComplete="off"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#a8a29a" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Filter and sort"
              className="relative w-11 h-11 flex items-center justify-center rounded-full active:scale-95 transition-transform flex-shrink-0"
              style={{ background: filterCount > 0 ? ACCENT : "#FBF7EE", border: "2px solid #171410" }}
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
        </div>

        {/* Auto-collections — zany Beli-style chips, filter the grid in place */}
        {isLibrary && autoCollections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-2.5" style={{ scrollbarWidth: "none" }}>
            <Chip label="All" active={!chip} onClick={() => setChip(null)} />
            {autoCollections.map((c) => (
              <Chip key={c.key} label={c.label} color={c.color} active={chip === c.key} onClick={() => setChip(chip === c.key ? null : c.key)} />
            ))}
          </div>
        )}
        </div>{/* close max-w-5xl */}
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div
        className="flex-1 px-4 py-4 overflow-y-auto max-w-5xl mx-auto w-full"
        style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}
      >

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
                <div className="h-36 sm:h-44 skeleton-warm" />
                <div className="bg-white px-3 pt-2.5 pb-3 space-y-2">
                  <div className="h-3 skeleton-warm rounded-full w-4/5" />
                  <div className="h-3 skeleton-warm rounded-full w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : displayRecipes.length === 0 ? (
          <div className="text-center py-20 animate-fade-slide-up">
            <div className="flex justify-center mb-4" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.45 }}>
              {hasFilters ? <SearchIcon className="w-12 h-12" /> : <MealIcon className="w-12 h-12" strokeWidth={1.5} />}
            </div>
            <p style={{ fontFamily: '"Marker Felt", Georgia, serif', fontWeight: 700, fontSize: 22, color: "#171410", marginBottom: 4 }}>
              {hasFilters ? "No matches" : "Nothing saved yet"}
            </p>
            <p style={{ fontFamily: '"Bradley Hand", "Segoe Script", cursive', fontSize: 17, color: "#E5462E", marginBottom: 20 }}>
              {hasFilters ? "try different filters" : "save your first recipe to get started"}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} style={{ fontFamily: '"Marker Felt", Georgia, serif', fontWeight: 700, fontSize: 15, color: "#171410", background: "#FBF7EE", border: "2px solid #171410", borderRadius: 12, padding: "10px 18px" }}>
                Clear filters
              </button>
            )}
            {!hasFilters && props.mode === "library" && (
              <Link href="/recipes/new" style={{ fontFamily: '"Marker Felt", Georgia, serif', fontWeight: 700, fontSize: 16, color: "#FBF7EE", background: "#E5462E", border: "2.5px solid #171410", borderRadius: 12, padding: "12px 20px", boxShadow: "0 8px 18px rgba(229,70,46,0.28)" }}>
                Save a recipe →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* "Recently added" header + inline View all / Show less */}
            {showSections && (
              <div className="flex items-end justify-between mb-3">
                <div>
                  <h2 style={SECTION_HEADING}>Recently added</h2>
                  <svg width="132" height="9" viewBox="0 0 132 9" fill="none" aria-hidden style={{ marginTop: 1 }}><path d="M2 6 C 26 2, 44 8, 66 5 S 110 2, 130 5" stroke="#E5462E" strokeWidth="3" strokeLinecap="round" /></svg>
                </div>
                {canExpand && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="flex items-center gap-1 text-[13px] font-semibold transition-colors active:scale-95"
                    style={{ color: "var(--ink-soft, #4A4742)" }}
                  >
                    {showAll ? "Show less" : "View all"}
                    <svg className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {gridRecipes.map((recipe, i) => {
                const tilt = [-2.4, 1.7, 1.3, -1.8, 2.1, -1.2][i % 6];
                const tape = ["rgba(255,216,77,0.88)", "rgba(196,238,69,0.82)", "rgba(255,77,157,0.72)", "rgba(201,184,255,0.85)"][i % 4];
                return (
                  <div key={recipe.id} style={{ position: "relative", transform: `rotate(${tilt}deg)` }}>
                    {/* washi tape — a little chaos on each card */}
                    <div aria-hidden style={{ position: "absolute", top: -7, left: "50%", marginLeft: -27, width: 56, height: 17, background: tape, transform: `rotate(${i % 2 ? 5 : -6}deg)`, zIndex: 20, boxShadow: "0 1px 2px rgba(23,20,16,0.12)" }} />
                    <BrowserCard
                      recipe={recipe}
                      index={i}
                      mode={props.mode}
                      aspect={cardAspect}
                      onAdd={props.mode === "library" && props.onAddToMealPlan ? () => props.onAddToMealPlan!(recipe.id) : undefined}
                      onCollection={props.mode === "library" && props.onAddToCollection ? () => props.onAddToCollection!(recipe.id) : undefined}
                      isInCollection={props.mode === "library" && props.inCollectionIds ? props.inCollectionIds.has(recipe.id) : false}
                      onPick={props.mode === "pick" ? () => handlePick(recipe.id) : undefined}
                      isPicking={selectingId === recipe.id}
                    />
                  </div>
                );
              })}
            </div>

            {/* ── Collections section ─────────────────────────────────── */}
            {showSections && (
              <div className="mt-8">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h2 style={SECTION_HEADING}>Collections</h2>
                    <svg width="96" height="9" viewBox="0 0 96 9" fill="none" aria-hidden style={{ marginTop: 1 }}><path d="M2 6 C 20 2, 34 8, 50 5 S 80 2, 94 5" stroke="#2540E8" strokeWidth="3" strokeLinecap="round" /></svg>
                  </div>
                  <button
                    onClick={() => router.push("/collections")}
                    className="flex items-center gap-1 text-[13px] font-semibold transition-colors active:scale-95"
                    style={{ color: "var(--ink-soft, #4A4742)" }}
                  >
                    View all
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
                  {/* Virtual "Recently Added" collection — always present so even
                      brand-new users (no real collections) get a default
                      collection containing what they've saved. */}
                  <Link
                    href="/collections/recently-added"
                    className="flex-shrink-0 w-28 active:scale-[0.97] transition-transform"
                  >
                    <div
                      className="relative w-full rounded-2xl overflow-hidden"
                      style={{ aspectRatio: "1 / 1", background: "var(--cream-warm, #EFE5D2)", boxShadow: "0 2px 10px rgba(20,12,5,0.08)" }}
                    >
                      {displayRecipes[0]?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={displayRecipes[0].image_url!} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.4 }}>
                          <CollectionsIcon className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13px] font-semibold truncate" style={{ color: "var(--ink, #1C1A17)" }}>
                      Recently Added
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.6 }}>
                      {displayRecipes.length} {displayRecipes.length === 1 ? "recipe" : "recipes"}
                    </p>
                  </Link>

                  {collections.slice(0, 12).map((c) => {
                    const img = (c.preview_images ?? [])[0];
                    const cnt = c.recipe_count ?? 0;
                    return (
                      <Link
                        key={c.id}
                        href={`/collections/${c.id}`}
                        className="flex-shrink-0 w-28 active:scale-[0.97] transition-transform"
                      >
                        <div
                          className="relative w-full rounded-2xl overflow-hidden"
                          style={{ aspectRatio: "1 / 1", background: "var(--cream-warm, #EFE5D2)", boxShadow: "0 2px 10px rgba(20,12,5,0.08)" }}
                        >
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.4 }}>
                              <CollectionsIcon className="w-7 h-7" />
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 text-[13px] font-semibold truncate" style={{ color: "var(--ink, #1C1A17)" }}>
                          {c.name}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.6 }}>
                          {cnt} {cnt === 1 ? "recipe" : "recipes"}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RecipeFilterSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={filters}
        onChange={setFilters}
        totalFiltered={filtered.length}
      />
    </div>
  );
}
