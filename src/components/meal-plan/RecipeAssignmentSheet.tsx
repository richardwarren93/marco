"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan, Recipe } from "@/types";

type SheetMode = "default" | "confirm_replace" | "search";
type AssignMode = "weekdays" | "weekend" | "pick_days";

const MEAL_TYPES = [
  { key: "breakfast", icon: "🌅", label: "Breakfast" },
  { key: "lunch", icon: "☀️", label: "Lunch" },
  { key: "dinner", icon: "🌙", label: "Dinner" },
  { key: "snack", icon: "🍎", label: "Snack" },
] as const;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface SheetConfig {
  recipeId: string | null;
  draftNotes: string | null;
  recipeTitle: string;
  defaultMealType: string;
  contextDate: string | null;
  startInSearchMode: boolean;
}

interface ConflictSlot {
  date: string;
  mealType: string;
  existingTitle: string;
}

interface RecipeAssignmentSheetProps {
  isOpen: boolean;
  config: SheetConfig | null;
  weekDays: string[]; // 7 YYYY-MM-DD Mon–Sun
  mealPlans: MealPlan[];
  onAssign: (
    slots: { date: string; mealType: string }[],
    replace: boolean,
    recipeId: string | null,
    draftNotes: string | null
  ) => Promise<void>;
  onClose: () => void;
}

function getExistingTitle(plans: MealPlan[], date: string, mealType: string): string | null {
  const existing = plans.find(
    (p) => p.planned_date === date && p.meal_type === mealType && !p.owner_name
  );
  if (!existing) return null;
  if (existing.recipe?.title) return existing.recipe.title;
  try {
    const d = JSON.parse(existing.notes || "");
    return d.title || "Untitled";
  } catch {
    return "Untitled";
  }
}

export default function RecipeAssignmentSheet({
  isOpen,
  config,
  weekDays,
  mealPlans,
  onAssign,
  onClose,
}: RecipeAssignmentSheetProps) {
  const [mode, setMode] = useState<SheetMode>("default");
  const [mealTypes, setMealTypes] = useState<string[]>(["dinner"]);
  const [assignMode, setAssignMode] = useState<AssignMode>("weekdays");
  const [selectedDays, setSelectedDays] = useState<boolean[]>(Array(7).fill(false));
  const [conflicts, setConflicts] = useState<ConflictSlot[]>([]);
  const [pendingSlots, setPendingSlots] = useState<{ date: string; mealType: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Search mode
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [chosenRecipe, setChosenRecipe] = useState<{ id: string; title: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !config) return;
    setMode(config.startInSearchMode ? "search" : "default");
    setMealTypes([config.defaultMealType || "dinner"]);
    setAssignMode("weekdays");
    setSelectedDays(Array(7).fill(false));
    setConflicts([]);
    setPendingSlots([]);
    setSearch("");
    setChosenRecipe(null);
    if (config.startInSearchMode) fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, config]);

  async function fetchRecipes() {
    setLoadingRecipes(true);
    const { data } = await supabase
      .from("recipes")
      .select("id, title, tags, prep_time_minutes, cook_time_minutes")
      .order("created_at", { ascending: false })
      .limit(50);
    setRecipes((data as Recipe[]) || []);
    setLoadingRecipes(false);
  }

  const effectiveRecipeId = chosenRecipe?.id ?? config?.recipeId ?? null;
  const effectiveDraftNotes = chosenRecipe ? null : (config?.draftNotes ?? null);
  const effectiveTitle = chosenRecipe?.title ?? config?.recipeTitle ?? "";

  function toggleMealType(key: string) {
    setMealTypes((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // must keep at least one
        return prev.filter((mt) => mt !== key);
      }
      return [...prev, key];
    });
  }

  function buildSlots(): { date: string; mealType: string }[] {
    const days =
      assignMode === "weekdays"
        ? weekDays.slice(0, 5)
        : assignMode === "weekend"
        ? weekDays.slice(5)
        : weekDays.filter((_, i) => selectedDays[i]);
    // Cross-product: each selected day × each selected meal type
    return days.flatMap((date) => mealTypes.map((mt) => ({ date, mealType: mt })));
  }

  function detectConflicts(slots: { date: string; mealType: string }[]): ConflictSlot[] {
    return slots
      .map((slot) => {
        const existing = getExistingTitle(mealPlans, slot.date, slot.mealType);
        if (existing) return { ...slot, existingTitle: existing };
        return null;
      })
      .filter(Boolean) as ConflictSlot[];
  }

  function handleCTA() {
    const slots = buildSlots();
    if (!slots.length) return;
    const found = detectConflicts(slots);
    if (found.length > 0) {
      setConflicts(found);
      setPendingSlots(slots);
      setMode("confirm_replace");
    } else {
      doAssign(slots, false);
    }
  }

  async function doAssign(slots: { date: string; mealType: string }[], replace: boolean) {
    setSubmitting(true);
    try {
      await onAssign(slots, replace, effectiveRecipeId, effectiveDraftNotes);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleDay(i: number) {
    setSelectedDays((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  const selectedCount = selectedDays.filter(Boolean).length;

  const ctaEnabled = assignMode !== "pick_days" || selectedCount > 0;

  function ctaLabel() {
    if (submitting) return "Adding…";
    const total = buildSlots().length;
    if (total === 0) return "Add to week";
    if (assignMode === "weekdays") {
      return mealTypes.length > 1 ? `Add ${total} slots` : "Add to weekdays";
    }
    if (assignMode === "weekend") {
      return mealTypes.length > 1 ? `Add ${total} slots` : "Add to weekend";
    }
    return `Add ${total} slot${total !== 1 ? "s" : ""}`;
  }

  const filteredRecipes = search
    ? recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : recipes;

  if (!isOpen || !config) return null;

  const showDayGrid = mode === "default" && assignMode === "pick_days";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[88vh] flex flex-col animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* ── SEARCH MODE ── */}
        {mode === "search" && (
          <>
            <div className="px-5 pb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-gray-900">Add a recipe</h2>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden px-5 pb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your recipes…"
                autoFocus
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 mb-3"
              />
              <div className="flex-1 overflow-y-auto space-y-1">
                {loadingRecipes ? (
                  <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
                ) : filteredRecipes.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">
                    {search ? "No matching recipes" : "No saved recipes yet"}
                  </p>
                ) : (
                  filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setChosenRecipe({ id: r.id, title: r.title });
                        setMode("default");
                      }}
                      className="w-full text-left px-3 py-3 min-h-[44px] rounded-xl hover:bg-orange-50 transition-colors group"
                    >
                      <p className="text-sm font-medium text-gray-800 group-hover:text-orange-700 line-clamp-1">
                        {r.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.tags?.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] text-gray-400">#{tag}</span>
                        ))}
                        {(r.prep_time_minutes || r.cook_time_minutes) && (
                          <span className="text-[10px] text-gray-400">
                            {(r.prep_time_minutes || 0) + (r.cook_time_minutes || 0)} min
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ── DEFAULT MODE ── */}
        {mode === "default" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Recipe title */}
            <div className="px-5 pb-3 flex-shrink-0">
              <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-widest mb-1">
                Adding
              </p>
              <h2 className="text-lg font-bold text-gray-900 line-clamp-2 leading-snug">
                {effectiveTitle}
              </h2>
            </div>

            {/* Scrollable controls */}
            <div className="flex-1 overflow-y-auto px-5">
              {/* Meal type — 4 equal tiles */}
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Meal type
              </p>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {MEAL_TYPES.map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleMealType(key)}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl text-xs font-semibold transition-all gap-1 ${
                      mealTypes.includes(key)
                        ? "bg-orange-600 text-white shadow-sm scale-[1.02]"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    <span className="text-xl leading-none">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Assignment mode — segmented control */}
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                When
              </p>
              <div className="flex rounded-xl bg-gray-100 p-0.5 mb-4 gap-0.5">
                {(
                  [
                    { am: "weekdays" as AssignMode, label: "Weekdays" },
                    { am: "weekend" as AssignMode, label: "Weekend" },
                    { am: "pick_days" as AssignMode, label: "Pick days" },
                  ] as { am: AssignMode; label: string }[]
                ).map(({ am, label }) => (
                  <button
                    key={am}
                    onClick={() => {
                      setAssignMode(am);
                      setSelectedDays(Array(7).fill(false));
                    }}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-[10px] transition-all ${
                      assignMode === am
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Schedule hint */}
              {assignMode === "weekdays" && (
                <p className="text-xs text-gray-400 -mt-2 mb-4">
                  Mon – Fri · {mealTypes.map((mt) => mt.charAt(0).toUpperCase() + mt.slice(1)).join(" + ")}
                </p>
              )}
              {assignMode === "weekend" && (
                <p className="text-xs text-gray-400 -mt-2 mb-4">
                  Sat + Sun · {mealTypes.map((mt) => mt.charAt(0).toUpperCase() + mt.slice(1)).join(" + ")}
                </p>
              )}

              {/* Day grid — pick_days or just_once */}
              {showDayGrid && (
                <div className="grid grid-cols-7 gap-1.5 mb-4">
                  {DAY_LABELS.map((label, i) => {
                    const date = weekDays[i];
                    const occupied = date
                      ? mealTypes.some((mt) => !!getExistingTitle(mealPlans, date, mt))
                      : false;
                    return (
                      <button
                        key={label}
                        onClick={() => toggleDay(i)}
                        className={`flex flex-col items-center py-3 min-h-[44px] justify-center rounded-xl text-xs font-semibold transition-colors ${
                          selectedDays[i]
                            ? "bg-orange-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {label}
                        {occupied && !selectedDays[i] && (
                          <span className="w-1 h-1 rounded-full bg-orange-400 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bottom padding */}
              <div className="h-2" />
            </div>

            {/* Sticky CTA */}
            <div className="px-5 pb-8 pt-3 border-t border-gray-50 flex-shrink-0">
              <button
                onClick={handleCTA}
                disabled={!ctaEnabled || submitting}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-base hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {ctaLabel()}
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIRM REPLACE MODE ── */}
        {mode === "confirm_replace" && (
          <div className="px-5 pb-6 flex-shrink-0">
            <div className="pb-3">
              <h2 className="text-base font-bold text-gray-900">Replace existing meals?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {conflicts.length === 1
                ? `${new Date(conflicts[0].date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })} already has "${conflicts[0].existingTitle}".`
                : `${conflicts.length} slots already have meals.`}{" "}
              This will replace them.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => doAssign(pendingSlots, true)}
                disabled={submitting}
                className="flex-1 py-3.5 bg-orange-600 text-white rounded-2xl font-semibold text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Replacing…" : "Replace all"}
              </button>
              <button
                onClick={() => setMode("default")}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Go back
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
