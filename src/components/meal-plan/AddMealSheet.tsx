"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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

// ─── Recipe row — two sizes ───────────────────────────────────────────────────
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

  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const recipeSectionRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // When search input is focused, scroll the recipe section to the top of the
  // sheet body AFTER the iOS keyboard finishes opening (fires on visualViewport resize).
  useEffect(() => {
    if (!searchFocused) return;

    function scrollRecipeToTop() {
      if (recipeSectionRef.current && scrollBodyRef.current) {
        const offset =
          recipeSectionRef.current.offsetTop - scrollBodyRef.current.offsetTop;
        scrollBodyRef.current.scrollTo({ top: offset, behavior: "smooth" });
      }
    }

    // iOS keyboard takes ~300ms; fire on resize (keyboard done) + fallback timeout
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", scrollRecipeToTop);
    }
    const t = setTimeout(scrollRecipeToTop, 350);

    return () => {
      vv?.removeEventListener("resize", scrollRecipeToTop);
      clearTimeout(t);
    };
  }, [searchFocused]);

  // Lock main scroll while sheet is open; reset scroll position on close
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
    setSelectedRecipeId(defaultRecipeId ?? null); // pre-select if coming from recipe card
    setServings(defaultServings ?? 1);
    setRecipeSearch("");
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

  // IDs of all recipes already in any weekPlan (for "not scheduled" check)
  const anyScheduledIds = useMemo(
    () => new Set(weekPlans.filter((p) => p.recipe_id).map((p) => p.recipe_id as string)),
    [weekPlans]
  );

  // IDs of recipes scheduled for the selected meal type(s)
  const scheduledByTypeIds = useMemo(
    () =>
      new Set(
        weekPlans
          .filter((p) => selectedMealTypes.has(p.meal_type as MealType) && p.recipe_id)
          .map((p) => p.recipe_id as string)
      ),
    [weekPlans, selectedMealTypes]
  );

  // "Picked but not scheduled" — in weekPickIds but not in any weekPlan at all
  const notScheduledPicks = useMemo(
    () => allRecipes.filter((r) => weekPickIds.includes(r.id) && !anyScheduledIds.has(r.id)),
    [allRecipes, weekPickIds, anyScheduledIds]
  );

  // "Scheduled" — unique recipes in weekPlans for selected meal types, max 2
  const scheduledRecipes = useMemo(() => {
    const seen = new Set<string>();
    return weekPlans
      .filter((p) => selectedMealTypes.has(p.meal_type as MealType) && p.recipe_id)
      .map((p) => allRecipes.find((r) => r.id === p.recipe_id))
      .filter((r): r is Recipe => !!r && !seen.has(r.id) && (seen.add(r.id), true))
      .slice(0, 2);
  }, [weekPlans, selectedMealTypes, allRecipes]);

  // Search results — title + tags + ingredients + description, with fuzzy matching
  const searchResults = useMemo(() => {
    const q = recipeSearch.trim();
    if (!q) return [];
    return allRecipes.filter((r) => recipeMatchesQuery(r, q)).slice(0, 12);
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

  function selectRecipe(id: string) {
    setSelectedRecipeId((prev) => (prev === id ? null : id));
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

  // Secondary suggestions shown below a single result or on zero results
  const hasNotScheduled = notScheduledPicks.length > 0;
  const hasScheduled = scheduledRecipes.length > 0;

  function renderSecondaryPicks() {
    if (!hasNotScheduled) return null;
    return (
      <div className="mt-3">
        <SectionLabel>Picked but not scheduled</SectionLabel>
        <div className="space-y-1">
          {notScheduledPicks.slice(0, 2).map((r) => (
            <RecipeRow
              key={r.id}
              recipe={r}
              isSelected={selectedRecipeId === r.id}
              badge="Pick"
              compact
              onClick={() => selectRecipe(r.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderSecondaryScheduled() {
    if (!hasScheduled) return null;
    return (
      <div className="mt-3">
        <SectionLabel>Scheduled</SectionLabel>
        <div className="space-y-1">
          {scheduledRecipes.map((r) => (
            <RecipeRow
              key={r.id}
              recipe={r}
              isSelected={selectedRecipeId === r.id}
              badge="Scheduled"
              dimmed
              compact
              onClick={() => selectRecipe(r.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={onClose}>
        <div
          className="bg-white w-full rounded-t-3xl max-h-[88dvh] flex flex-col shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Body — scrollable */}
          <div ref={scrollBodyRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2.5 pb-2 space-y-3.5 min-h-0">

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

            {/* Recipe search + results — sticky when focused so input stays visible above keyboard */}
            <div
              ref={recipeSectionRef}
              className={searchFocused ? "sticky top-0 bg-white z-10 -mx-4 px-4 pt-1 pb-2" : ""}
            >
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Recipe
              </p>

              {/* Search input */}
              <input
                ref={searchInputRef}
                type="text"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search recipes…"
                className="w-full px-3 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all"
                autoComplete="off"
              />

              {/* Results area */}
              {!query ? (
                /* ── Initial state ─────────────────────────────────────── */
                <div className="mt-2 space-y-1.5">
                  {/* Show selected recipe from Browse as a preview card */}
                  {selectedRecipeId && (() => {
                    const picked = allRecipes.find((r) => r.id === selectedRecipeId);
                    return picked ? (
                      <RecipeRow
                        recipe={picked}
                        isSelected
                        badge={
                          weekPickIds.includes(picked.id) && !anyScheduledIds.has(picked.id)
                            ? "Pick"
                            : scheduledByTypeIds.has(picked.id)
                            ? "Scheduled"
                            : undefined
                        }
                        onClick={() => setSelectedRecipeId(null)}
                      />
                    ) : null;
                  })()}
                  <button
                    onClick={() => { onClose(); router.push("/recipes"); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {selectedRecipeId ? "Change recipe" : "Browse saved recipes"}
                  </button>
                </div>
              ) : hitCount >= 2 ? (
                /* ── Case A: 2+ results — show only results ────────────── */
                <div className="mt-2 space-y-1">
                  {searchResults.map((r) => (
                    <RecipeRow
                      key={r.id}
                      recipe={r}
                      isSelected={selectedRecipeId === r.id}
                      badge={
                        weekPickIds.includes(r.id) && !anyScheduledIds.has(r.id)
                          ? "Pick"
                          : scheduledByTypeIds.has(r.id)
                          ? "Scheduled"
                          : undefined
                      }
                      dimmed={scheduledByTypeIds.has(r.id)}
                      onClick={() => selectRecipe(r.id)}
                    />
                  ))}
                </div>
              ) : hitCount === 1 ? (
                /* ── Case B: exactly 1 result + one secondary section ──── */
                <div className="mt-2 space-y-1">
                  <RecipeRow
                    recipe={searchResults[0]}
                    isSelected={selectedRecipeId === searchResults[0].id}
                    badge={
                      weekPickIds.includes(searchResults[0].id) && !anyScheduledIds.has(searchResults[0].id)
                        ? "Pick"
                        : scheduledByTypeIds.has(searchResults[0].id)
                        ? "Scheduled"
                        : undefined
                    }
                    onClick={() => selectRecipe(searchResults[0].id)}
                  />
                  {hasNotScheduled
                    ? renderSecondaryPicks()
                    : renderSecondaryScheduled()}
                </div>
              ) : (
                /* ── Case C: 0 results ─────────────────────────────────── */
                <div className="mt-2">
                  <p className="text-xs text-gray-400 text-center py-3">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  {renderSecondaryPicks()}
                  {renderSecondaryScheduled()}
                </div>
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

          {/* CTA — always pinned above nav bar */}
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

    </>
  );
}
