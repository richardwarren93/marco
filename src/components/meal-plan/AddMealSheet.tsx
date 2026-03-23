"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MealPlan, Recipe } from "@/types";
import { recipeMatchesQuery } from "@/lib/recipeSearch";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_TYPE_COLORS: Record<MealType, { active: string; inactive: string }> = {
  breakfast: {
    active: "bg-amber-500 text-white border-amber-500",
    inactive: "bg-gray-100 text-gray-500 border-gray-100 hover:bg-gray-200",
  },
  lunch: {
    active: "bg-green-500 text-white border-green-500",
    inactive: "bg-gray-100 text-gray-500 border-gray-100 hover:bg-gray-200",
  },
  dinner: {
    active: "bg-violet-500 text-white border-violet-500",
    inactive: "bg-gray-100 text-gray-500 border-gray-100 hover:bg-gray-200",
  },
  snack: {
    active: "bg-orange-500 text-white border-orange-500",
    inactive: "bg-gray-100 text-gray-500 border-gray-100 hover:bg-gray-200",
  },
};

const MEAL_PLACEHOLDER: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── Recipe row ──────────────────────────────────────────────────────────────
function RecipeRow({
  recipe,
  isSelected,
  badge,
  dimmed,
  compact,
  onClick,
}: {
  recipe: Recipe;
  isSelected: boolean;
  badge?: string;
  dimmed?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-xl text-left transition-colors border ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2.5"
      } ${
        isSelected
          ? "bg-orange-50 border-orange-200"
          : "bg-gray-50 border-transparent hover:bg-gray-100"
      } ${dimmed ? "opacity-55" : ""}`}
    >
      <div
        className={`rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center ${
          compact ? "w-7 h-7" : "w-9 h-9"
        }`}
      >
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <span className={compact ? "text-xs" : "text-sm"}>
            {MEAL_PLACEHOLDER[recipe.meal_type] || "🍳"}
          </span>
        )}
      </div>
      <span
        className={`font-medium text-gray-800 line-clamp-1 flex-1 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {recipe.title}
      </span>
      {badge && (
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            badge === "Scheduled"
              ? "bg-gray-100 text-gray-400"
              : "bg-orange-100 text-orange-600"
          }`}
        >
          {badge}
        </span>
      )}
      {isSelected && (
        <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AddMealSheet({
  isOpen,
  defaultDate,
  defaultRecipeId,
  defaultMealTypes,
  defaultServings = 1,
  replacePlanId,
  weekStart,
  allRecipes,
  weekPickIds = [],
  weekPlans = [],
  onClose,
  onAdd,
  onRemove,
}: {
  isOpen: boolean;
  defaultDate: string;
  defaultRecipeId?: string;
  defaultMealTypes?: string[];
  defaultServings?: number;
  replacePlanId?: string;
  weekStart: Date;
  allRecipes: Recipe[];
  weekPickIds?: string[];
  weekPlans?: MealPlan[];
  onClose: () => void;
  onAdd: (recipeId: string, dates: string[], mealType: string, servings?: number) => Promise<void>;
  onRemove?: (planId: string) => void;
}) {
  const router = useRouter();
  const [selectedMealTypes, setSelectedMealTypes] = useState<Set<MealType>>(new Set<MealType>(["dinner"]));
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set([defaultDate]));
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [servings, setServings] = useState(defaultServings);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Track visual viewport for keyboard-aware positioning on iOS
  const [vpRect, setVpRect] = useState<{ height: number; offsetTop: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;

    function sync() {
      setVpRect({ height: vv!.height, offsetTop: vv!.offsetTop });
    }
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [isOpen]);

  // Lock main scroll while sheet is open
  useEffect(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    if (!main) return;
    if (isOpen) {
      main.style.overflow = "hidden";
    } else {
      main.style.overflow = "";
      main.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    return () => { main.style.overflow = ""; };
  }, [isOpen]);

  // Reset when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    const validTypes = (
      defaultMealTypes?.filter((t) => MEAL_TYPES.includes(t as MealType)) ?? ["dinner"]
    ) as MealType[];
    setSelectedMealTypes(new Set(validTypes));
    setSelectedDates(new Set([defaultDate]));
    setSelectedRecipeId(defaultRecipeId ?? null);
    setServings(defaultServings ?? 1);
    setRecipeSearch("");
    setSearchMode(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mon–Sun grid
  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
          key: formatDateKey(d),
          dayAbbr: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
          dayNum: d.getDate(),
        };
      }),
    [weekStart]
  );

  const anyScheduledIds = useMemo(
    () => new Set(weekPlans.filter((p) => p.recipe_id).map((p) => p.recipe_id as string)),
    [weekPlans]
  );

  const scheduledByTypeIds = useMemo(
    () =>
      new Set(
        weekPlans
          .filter((p) => selectedMealTypes.has(p.meal_type as MealType) && p.recipe_id)
          .map((p) => p.recipe_id as string)
      ),
    [weekPlans, selectedMealTypes]
  );

  const notScheduledPicks = useMemo(
    () => allRecipes.filter((r) => weekPickIds.includes(r.id) && !anyScheduledIds.has(r.id)),
    [allRecipes, weekPickIds, anyScheduledIds]
  );

  const scheduledRecipes = useMemo(() => {
    const seen = new Set<string>();
    return weekPlans
      .filter((p) => selectedMealTypes.has(p.meal_type as MealType) && p.recipe_id)
      .map((p) => allRecipes.find((r) => r.id === p.recipe_id))
      .filter((r): r is Recipe => !!r && !seen.has(r.id) && (seen.add(r.id), true))
      .slice(0, 2);
  }, [weekPlans, selectedMealTypes, allRecipes]);

  // All recipes for browsing (sorted: meal-type match first, then alphabetical)
  const browseRecipes = useMemo(() => {
    return [...allRecipes].sort((a, b) => {
      const aMatch = selectedMealTypes.has(a.meal_type as MealType) ? 0 : 1;
      const bMatch = selectedMealTypes.has(b.meal_type as MealType) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.title.localeCompare(b.title);
    });
  }, [allRecipes, selectedMealTypes]);

  const searchResults = useMemo(() => {
    const q = recipeSearch.trim();
    if (!q) return [];
    return allRecipes.filter((r) => recipeMatchesQuery(r, q)).slice(0, 20);
  }, [recipeSearch, allRecipes]);

  function toggleMealType(mt: MealType) {
    setSelectedMealTypes((prev) => {
      const next = new Set(prev);
      if (next.has(mt)) {
        if (next.size > 1) next.delete(mt);
      } else {
        next.add(mt);
      }
      return next;
    });
  }

  function toggleDate(key: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const selectRecipe = useCallback((id: string) => {
    setSelectedRecipeId((prev) => (prev === id ? null : id));
    // Exit search mode after selecting, so user sees the full form
    setSearchMode(false);
    setRecipeSearch("");
  }, []);

  function enterSearchMode() {
    setSearchMode(true);
    // Focus the input after state update
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function exitSearchMode() {
    setSearchMode(false);
    setRecipeSearch("");
    searchInputRef.current?.blur();
  }

  async function handleAdd() {
    if (!selectedRecipeId || selectedDates.size === 0 || selectedMealTypes.size === 0) return;
    setSaving(true);
    try {
      const dates = [...selectedDates].sort();
      for (const mt of selectedMealTypes) {
        await onAdd(selectedRecipeId, dates, mt, servings);
      }
      if (replacePlanId && onRemove) onRemove(replacePlanId);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const isReplacing = !!replacePlanId;
  const query = recipeSearch.trim();
  const hitCount = searchResults.length;
  const hasNotScheduled = notScheduledPicks.length > 0;
  const hasScheduled = scheduledRecipes.length > 0;

  // Selected recipe info for the compact display
  const selectedRecipe = selectedRecipeId
    ? allRecipes.find((r) => r.id === selectedRecipeId)
    : null;

  // Summary chips for meal type + date when in search mode
  const mealTypeLabel = [...selectedMealTypes].map((mt) => mt.charAt(0).toUpperCase() + mt.slice(1)).join(", ");
  const selectedDateLabel = (() => {
    const dates = [...selectedDates].sort();
    if (dates.length === 1) {
      const wd = weekDates.find((d) => d.key === dates[0]);
      return wd ? `${wd.dayAbbr} ${wd.dayNum}` : dates[0];
    }
    return `${dates.length} days`;
  })();

  function getBadge(r: Recipe) {
    if (weekPickIds.includes(r.id) && !anyScheduledIds.has(r.id)) return "Pick";
    if (scheduledByTypeIds.has(r.id)) return "Scheduled";
    return undefined;
  }

  // ─── Search mode: full-screen recipe picker ─────────────────────────────────
  if (searchMode) {
    // Position sheet within the visual viewport (above keyboard on iOS)
    const sheetStyle: React.CSSProperties = vpRect
      ? { top: `${vpRect.offsetTop}px`, height: `${vpRect.height}px` }
      : { top: 0, height: "100dvh" };

    return (
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={exitSearchMode}>
        <div
          className="fixed left-0 right-0 bg-white flex flex-col shadow-xl overflow-hidden"
          style={sheetStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: back + context chips */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0">
            <button
              onClick={exitSearchMode}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex gap-1.5 flex-1 min-w-0">
              <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 truncate">
                {mealTypeLabel}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                {selectedDateLabel}
              </span>
            </div>
          </div>

          {/* Search input — always visible */}
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder="Search your recipes…"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all"
                autoComplete="off"
                autoFocus
              />
              {recipeSearch && (
                <button
                  onClick={() => setRecipeSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Results — scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 min-h-0">
            {query ? (
              hitCount > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((r) => (
                    <RecipeRow
                      key={r.id}
                      recipe={r}
                      isSelected={selectedRecipeId === r.id}
                      badge={getBadge(r)}
                      dimmed={scheduledByTypeIds.has(r.id)}
                      onClick={() => selectRecipe(r.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No recipes match &ldquo;{query}&rdquo;</p>
                  <button
                    onClick={() => { onClose(); router.push("/recipes"); }}
                    className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600"
                  >
                    Browse all recipes
                  </button>
                </div>
              )
            ) : (
              /* No query — show suggestions then all recipes */
              <div className="space-y-3">
                {hasNotScheduled && (
                  <div>
                    <SectionLabel>Picked but not scheduled</SectionLabel>
                    <div className="space-y-1">
                      {notScheduledPicks.slice(0, 3).map((r) => (
                        <RecipeRow
                          key={r.id}
                          recipe={r}
                          isSelected={selectedRecipeId === r.id}
                          badge="Pick"
                          onClick={() => selectRecipe(r.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {hasScheduled && (
                  <div>
                    <SectionLabel>Already scheduled</SectionLabel>
                    <div className="space-y-1">
                      {scheduledRecipes.map((r) => (
                        <RecipeRow
                          key={r.id}
                          recipe={r}
                          isSelected={selectedRecipeId === r.id}
                          badge="Scheduled"
                          dimmed
                          onClick={() => selectRecipe(r.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <SectionLabel>All recipes</SectionLabel>
                  <div className="space-y-1">
                    {browseRecipes.map((r) => (
                      <RecipeRow
                        key={r.id}
                        recipe={r}
                        isSelected={selectedRecipeId === r.id}
                        badge={getBadge(r)}
                        dimmed={scheduledByTypeIds.has(r.id)}
                        onClick={() => selectRecipe(r.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal mode: compact form ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={onClose}>
      <div
        ref={sheetRef}
        className="bg-white w-full rounded-t-3xl max-h-[88dvh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Body */}
        <div
          ref={scrollBodyRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2.5 pb-2 space-y-4 min-h-0"
        >
          {/* Meal type */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Meal type
            </p>
            <div className="flex gap-1.5">
              {MEAL_TYPES.map((mt) => {
                const colors = MEAL_TYPE_COLORS[mt];
                return (
                  <button
                    key={mt}
                    onClick={() => toggleMealType(mt)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${
                      selectedMealTypes.has(mt) ? colors.active : colors.inactive
                    }`}
                  >
                    {mt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* When */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              When
            </p>
            <div className="flex gap-1">
              {weekDates.map(({ key, dayAbbr, dayNum }) => {
                const isSelected = selectedDates.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleDate(key)}
                    className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    <span className="text-[10px] font-medium">{dayAbbr}</span>
                    <span className="text-sm font-bold mt-0.5">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe selector — tap to enter search mode */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Recipe
            </p>
            {selectedRecipe ? (
              <div className="space-y-1.5">
                <RecipeRow
                  recipe={selectedRecipe}
                  isSelected
                  badge={getBadge(selectedRecipe)}
                  onClick={() => setSelectedRecipeId(null)}
                />
                <button
                  onClick={enterSearchMode}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-400 hover:text-orange-500 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Change recipe
                </button>
              </div>
            ) : (
              <button
                onClick={enterSearchMode}
                className="w-full flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl border border-gray-200 border-dashed hover:bg-gray-100 hover:border-gray-300 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-400 font-medium">Search your recipes…</span>
              </button>
            )}
          </div>

          {/* Servings */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Servings
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                −
              </button>
              <span className="text-sm font-semibold text-gray-900 w-4 text-center">
                {servings}
              </span>
              <button
                onClick={() => setServings((s) => s + 1)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className="px-4 pt-3 pb-3 border-t border-gray-100 flex-shrink-0"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
        >
          <button
            onClick={handleAdd}
            disabled={saving || !selectedRecipeId}
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {saving ? "Adding…" : isReplacing ? "Replace meal" : "Add to plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
