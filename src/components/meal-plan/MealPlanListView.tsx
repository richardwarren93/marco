"use client";

import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useSWR, { mutate as swrMutate } from "swr";
import type { MealPlan, Recipe, Ingredient } from "@/types";
import { useTrending, useRecipes, apiFetcher } from "@/lib/hooks/use-data";
import { findDietaryConflicts } from "@/lib/cook/dietary";
import AddMealSheet from "./AddMealSheet";
import RecipePreviewSheet from "./RecipePreviewSheet";
import EditMealSheet from "./EditMealSheet";
import CoordinationView from "./CoordinationView";
import SwipeToDelete from "@/components/ui/SwipeToDelete";
import { GroceryIcon } from "@/components/icons/HandDrawnIcons";
import { MealTypeIcon } from "@/components/icons/MealIcons";

// ─── Theme ────────────────────────────────────────────────────────────────────
const ACCENT = "#e8530a";          // slightly calmer orange
const ACCENT_LIGHT = "#fff4ec";
const BG = "#F5EEE2"; // Marco cream — matches the rest of the app body background
const SURFACE = "#ffffff";
const TEXT_1 = "#141414";          // deeper near-black
const TEXT_2 = "#888";
const BORDER = "#e8e8e5";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;


function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function sortMeals(plans: MealPlan[]): MealPlan[] {
  return [...plans].sort(
    (a, b) =>
      MEAL_ORDER.indexOf(a.meal_type as (typeof MEAL_ORDER)[number]) -
      MEAL_ORDER.indexOf(b.meal_type as (typeof MEAL_ORDER)[number])
  );
}

// ─── Meal row (shared between daily and weekly views) ─────────────────────────
function MealRow({
  plan,
  onTap,
  onRemove,
  compact = false,
  done = false,
}: {
  plan: MealPlan;
  onTap: () => void;
  onRemove: (id: string) => void;
  compact?: boolean;
  /** Past-date / cooked treatment — strike-through title, faded thumbnail. */
  done?: boolean;
}) {
  return compact ? (
    /* ── Compact layout (weekly view): small left thumbnail ── */
    <SwipeToDelete onDelete={() => onRemove(plan.id)}>
      <div
        onClick={onTap}
        className="group relative w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer text-left active:bg-gray-50/40"
        style={{ background: SURFACE, opacity: done ? 0.5 : 1 }}
      >
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#f0f0ee" }}>
          {plan.recipe?.image_url
            ? <img src={plan.recipe.image_url} alt={plan.recipe?.title || ""} className="w-full h-full object-cover" style={done ? { filter: "grayscale(0.6)" } : undefined} />
            : <MealTypeIcon type={plan.meal_type} className="w-4 h-4 opacity-60" strokeWidth={1.8} />}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-semibold line-clamp-1"
            style={{
              color: plan.owner_name ? "#888" : TEXT_1,
              textDecoration: done ? "line-through" : "none",
              textDecorationColor: "var(--tomato, #E5462E)",
              textDecorationThickness: "1.5px",
              textDecorationSkipInk: "none",
            }}
          >
            {plan.recipe?.title || "Untitled"}
          </p>
          <p className="text-[11px] mt-0.5 capitalize font-medium" style={{ color: "#b8b8b8" }}>
            {plan.owner_name ? `${plan.meal_type} · ${plan.owner_name}` : plan.meal_type}
          </p>
        </div>
        {/* Desktop: trash on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(plan.id); }}
          className="hidden sm:flex opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full hover:bg-red-50 items-center justify-center flex-shrink-0 transition-opacity"
          aria-label="Remove meal"
        >
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </SwipeToDelete>
  ) : (
    /* ── Full layout (daily view): large left image ── */
    <SwipeToDelete onDelete={() => onRemove(plan.id)}>
      <div
        onClick={onTap}
        className="group relative w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer text-left active:bg-gray-50/30"
        style={{ background: SURFACE }}
      >
        <div
          className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: "#eeecea" }}
        >
          {plan.recipe?.image_url
            ? <img src={plan.recipe.image_url} alt={plan.recipe?.title || ""} className="w-full h-full object-cover" />
            : <MealTypeIcon type={plan.meal_type} className="w-7 h-7 opacity-50" strokeWidth={1.6} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold line-clamp-2 leading-snug" style={{ color: plan.owner_name ? "#888" : TEXT_1 }}>
            {plan.recipe?.title || "Untitled"}
          </p>
          <p className="text-[11px] mt-0.5 capitalize font-medium" style={{ color: "#b8b8b6" }}>
            {(() => {
              const base = plan.owner_name ? `${plan.meal_type} · ${plan.owner_name}` : plan.meal_type;
              const t = (plan.recipe?.prep_time_minutes ?? 0) + (plan.recipe?.cook_time_minutes ?? 0);
              return t > 0 ? `${base} · ${t} min` : base;
            })()}
          </p>
        </div>
        {/* Desktop: trash on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(plan.id); }}
          className="hidden sm:flex opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full hover:bg-red-50 items-center justify-center flex-shrink-0 transition-opacity"
          aria-label="Remove meal"
        >
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </SwipeToDelete>
  );
}

// ─── Expanded-day meal action (Swap / Edit / Remove) ─────────────────────────
function MealAction({
  label,
  onClick,
  icon,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all active:scale-95"
      style={{
        background: danger ? "rgba(229,70,46,0.05)" : "rgba(28,26,23,0.04)",
        color: danger ? "#E5462E" : "#4A4742",
        border: danger ? "1px solid rgba(229,70,46,0.20)" : "1px solid rgba(28,26,23,0.08)",
      }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {icon}
      </svg>
      {label}
    </button>
  );
}

// ─── Presentational meal card (used in the expanded day + drag overlay) ──────
function MealVisual({ plan, isPast = false, dragging = false }: { plan: MealPlan; isPast?: boolean; dragging?: boolean }) {
  const t = (plan.recipe?.prep_time_minutes ?? 0) + (plan.recipe?.cook_time_minutes ?? 0);
  return (
    <div
      className="w-full flex items-center gap-3 p-2 rounded-xl"
      style={{ background: dragging ? "#ffffff" : "var(--cream, #F5EEE2)", boxShadow: dragging ? "0 12px 30px rgba(20,12,5,0.24)" : undefined }}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#eeecea" }}>
        {plan.recipe?.image_url
          ? <img src={plan.recipe.image_url} alt={plan.recipe?.title || ""} className="w-full h-full object-cover" style={isPast ? { filter: "grayscale(0.6)" } : undefined} />
          : <MealTypeIcon type={plan.meal_type} className="w-6 h-6 opacity-50" strokeWidth={1.6} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold line-clamp-1" style={{ color: plan.owner_name ? "#888" : TEXT_1 }}>{plan.recipe?.title || "Untitled"}</p>
        <p className="text-[11px] mt-0.5 capitalize font-medium" style={{ color: "#b8b8b6" }}>
          {t > 0 ? `${t} min · ${plan.meal_type}` : plan.meal_type}{plan.owner_name ? ` · ${plan.owner_name}` : ""}
        </p>
      </div>
      {!plan.owner_name && (
        <span className="flex-shrink-0 pr-0.5" style={{ color: "#d0cabf" }} aria-hidden>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
            <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
            <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
          </svg>
        </span>
      )}
    </div>
  );
}

// ─── Draggable wrapper for a meal (long-press on touch, drag on desktop) ──────
function DraggableMeal({ id, disabled = false, children }: { id: string; disabled?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.4 : 1 }}>
      {children}
    </div>
  );
}

// ─── Droppable day card — accepts a meal dropped onto it ─────────────────────
function DroppableDay({ dateKey, domId, className, style, children }: { dateKey: string; domId?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dateKey}` });
  return (
    <div
      ref={setNodeRef}
      id={domId}
      className={className}
      style={{ ...style, outline: isOver ? "2px solid var(--tomato, #E5462E)" : "2px solid transparent", outlineOffset: -2, transition: "outline-color 0.12s ease" }}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MealPlanListView({
  mealPlans,
  householdPlans = [],
  onAddMeal,
  onRemove,
  onEditMeal,
  recipePool,
  allRecipes = [],
  weekPickIds = [],
  weekStart: weekStartProp,
  onWeekChange,
  onPlanThisWeek,
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onAddMeal: (recipeId: string, dates: string[], mealType: string, servings?: number) => Promise<void>;
  onRemove: (planId: string) => void;
  onEditMeal?: (planId: string, updates: { meal_type?: string; recipe_id?: string; servings?: number; planned_date?: string }) => Promise<void>;
  recipePool?: Recipe[];
  allRecipes?: Recipe[];
  weekPickIds?: string[];
  weekStart: Date;
  onWeekChange: (w: Date) => void;
  onPlanThisWeek?: (preSelectedRecipeId?: string) => void;
}) {
  const router = useRouter();

  // Dietary filters — used to mark days where any planned recipe contains an
  // ingredient that conflicts with the user's profile-level filters. The
  // badge is a soft heads-up; the recipe detail's per-row pill is the
  // authoritative call (it also accounts for standing subs).
  const { data: dietaryData } = useSWR<{ filters: string[] }>(
    "/api/user/dietary",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
  const dietaryFilters: string[] = dietaryData?.filters ?? [];

  // ─── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("weekly");
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);

  // Weekly view: per-day expand/collapse. A day not in the map defaults to
  // expanded when it has meals, collapsed when empty. Reset when the week
  // changes so the default applies to the new week's data.
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({});

  // ─── Drag-and-drop (move a meal to another day) ──────────────────────────────
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // planId → optimistic target date, so a dropped meal jumps instantly before
  // the server round-trip; cleared once the real data reflects the move.
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, string>>({});
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("day:")) return;
    const targetDate = overId.slice(4);
    const planId = String(active.id);
    const plan = mealPlans.find((p) => p.id === planId);
    if (!plan) return;
    const currentDate = optimisticMoves[planId] ?? plan.planned_date;
    if (currentDate === targetDate) return;
    setOptimisticMoves((prev) => ({ ...prev, [planId]: targetDate }));
    onEditMeal?.(planId, { planned_date: targetDate });
  }

  // ─── Week & day state ────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(weekStartProp);
  const today = formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  // Animate key — increment on day change to replay animation
  const [heroKey, setHeroKey] = useState(0);
  // Suggested recipe carousel index (resets on day change)
  const [suggestedIdx, setSuggestedIdx] = useState(0);

  useEffect(() => { setWeekStart(weekStartProp); setExpandedOverride({}); }, [weekStartProp]);
  useEffect(() => { setSuggestedIdx(0); }, [selectedDate]);

  // Drop optimistic moves once the persisted plan reflects the new date (or the
  // plan disappeared), so we stop overriding real data.
  useEffect(() => {
    setOptimisticMoves((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const pid of Object.keys(prev)) {
        const p = mealPlans.find((m) => m.id === pid);
        if (!p || p.planned_date === prev[pid]) { delete next[pid]; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [mealPlans]);

  // ─── FAB "Add meal" event listener ───────────────────────────────────────────
  useEffect(() => {
    function handleFabAdd() { openAddSheet(selectedDate); }
    window.addEventListener("openMealAddSheet", handleFabAdd);
    return () => window.removeEventListener("openMealAddSheet", handleFabAdd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function changeWeek(newWeek: Date) {
    setWeekStart(newWeek);
    onWeekChange(newWeek);
  }

  // ─── Day navigation (used by swipe + strip tap) ───────────────────────────
  function navigateToDate(dateKey: string) {
    setSelectedDate(dateKey);
    setHeroKey((k) => k + 1);
  }

  function goToPrevDay() {
    const idx = sortedDates.indexOf(selectedDate);
    if (idx > 0) {
      navigateToDate(sortedDates[idx - 1]);
    } else {
      // Cross week boundary backwards
      const newWeek = addDays(weekStart, -7);
      changeWeek(newWeek);
      navigateToDate(formatDateKey(addDays(newWeek, 6)));
    }
  }

  function goToNextDay() {
    const idx = sortedDates.indexOf(selectedDate);
    if (idx < sortedDates.length - 1) {
      navigateToDate(sortedDates[idx + 1]);
    } else {
      // Cross week boundary forwards
      const newWeek = addDays(weekStart, 7);
      changeWeek(newWeek);
      navigateToDate(formatDateKey(newWeek));
    }
  }

  // ─── Day-swipe touch handlers (wraps entire daily view) ─────────────────────
  const daySwipeRef = useRef<{
    startX: number; startY: number;
    locked: boolean; cancelled: boolean;
    startedOnMealRow: boolean;
  } | null>(null);

  function handleDaySwipeStart(e: React.TouchEvent) {
    // Always start tracking — but record whether touch began on a meal row.
    // touchRef.current is set synchronously by the meal row's onTouchStart
    // (inner element fires before bubbling up to this handler).
    daySwipeRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      locked: false,
      cancelled: false,
      startedOnMealRow: suggestedCardIsTouching.current,
    };
  }

  function handleDaySwipeMove(e: React.TouchEvent) {
    const ref = daySwipeRef.current;
    if (!ref || ref.cancelled) return;
    const dx = e.touches[0].clientX - ref.startX;
    const dy = e.touches[0].clientY - ref.startY;
    if (!ref.locked) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { ref.cancelled = true; return; }
      if (Math.abs(dx) > 8) ref.locked = true;
    }
  }

  function handleDaySwipeEnd(e: React.TouchEvent) {
    const ref = daySwipeRef.current;
    daySwipeRef.current = null;
    // Skip if cancelled, not committed horizontal, or if touch began on a meal row
    if (!ref || ref.cancelled || !ref.locked || ref.startedOnMealRow) return;
    const dx = e.changedTouches[0].clientX - ref.startX;
    if (Math.abs(dx) < 44) return; // ~44px threshold
    if (dx < 0) goToNextDay();
    else goToPrevDay();
  }

  // ─── Derived data ────────────────────────────────────────────────────────────
  const sortedDates = Array.from({ length: 7 }, (_, i) => formatDateKey(addDays(weekStart, i)));
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = (() => {
    const s = weekStart, e = weekEnd;
    const startDay = s.getDate(), endDay = e.getDate();
    const sm = s.toLocaleDateString("en-US", { month: "short" });
    const em = e.toLocaleDateString("en-US", { month: "short" });
    const yr = e.getFullYear();
    return s.getMonth() === e.getMonth() ? `${sm} ${startDay}–${endDay}` : `${sm} ${startDay} – ${em} ${endDay}`;
  })();

  const byDate: Record<string, MealPlan[]> = {};
  for (const plan of [...mealPlans, ...householdPlans]) {
    // Apply any in-flight optimistic move so a dropped meal shows on its new day.
    const date = optimisticMoves[plan.id] ?? plan.planned_date;
    if (!sortedDates.includes(date)) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(date === plan.planned_date ? plan : { ...plan, planned_date: date });
  }

  const totalVisibleMeals = Object.values(byDate).reduce((s, p) => s + p.length, 0);
  const weekMealPlans = mealPlans.filter((p) => sortedDates.includes(p.planned_date));
  const recipeLibrary = allRecipes.length > 0 ? allRecipes : recipePool ?? [];

  // ─── AddMealSheet state ──────────────────────────────────────────────────────
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addMealTypes, setAddMealTypes] = useState<string[] | undefined>(undefined);
  const [replacePlanId, setReplacePlanId] = useState<string | undefined>(undefined);
  const [addDefaultRecipeId, setAddDefaultRecipeId] = useState<string | undefined>(undefined);

  // ─── RecipePreviewSheet & EditMealSheet state ─────────────────────────────────
  const [previewPlan, setPreviewPlan] = useState<MealPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);

  // ─── Suggested card swipe ref (gesture isolation from day-swipe) ─────────────
  const suggestedCardIsTouching = useRef(false);

  // ─── Trending / Recommended data ───────────────────────────────────────────
  const { data: trendingData } = useTrending();
  const trending = trendingData?.trending ?? [];
  const [recommendSavedIds, setRecommendSavedIds] = useState<Set<string>>(new Set());
  const [recommendSavingIds, setRecommendSavingIds] = useState<Set<string>>(new Set());

  const recommendedRecipes = useMemo(() => {
    const trending = trendingData?.trending;
    if (!Array.isArray(trending) || trending.length === 0) return [];
    const libraryIds = new Set(recipeLibrary.map((r) => r.id));
    return trending
      .filter((t: { recipeId: string; image_url?: string | null }) => !libraryIds.has(t.recipeId) && t.image_url)
      .slice(0, 8);
  }, [trendingData, recipeLibrary]);

  // Coordination overlay — when set, the day's plans render through
  // CoordinationView so the user can anchor a serve time.
  const [coordinatePlans, setCoordinatePlans] = useState<MealPlan[] | null>(null);

  // Map trending recipe ID → user's saved copy ID
  const [savedIdMap, setSavedIdMap] = useState<Map<string, string>>(new Map());
  // Trending recipes the sheet should show before they exist in recipeLibrary.
  const [extraRecipes, setExtraRecipes] = useState<Recipe[]>([]);
  // Trending recipe ID → in-flight save promise. handleAdd awaits this so
  // meal_plans.recipe_id always points at the user's own saved copy.
  const pendingSaves = useRef<Map<string, Promise<{ savedId: string }>>>(new Map());

  const planTrending = useCallback((trending: {
    recipeId: string;
    title: string;
    image_url?: string | null;
    prep_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    meal_type?: string;
  }) => {
    // Already saved this session? Open sheet with the user's saved copy ID.
    const knownSaved = savedIdMap.get(trending.recipeId);
    if (knownSaved) {
      openAddSheetWithRecipe(selectedDate, knownSaved);
      return;
    }

    // Inject a minimal Recipe so AddMealSheet can render the row before the
    // background save finishes populating recipeLibrary.
    const placeholder: Recipe = {
      id: trending.recipeId,
      user_id: "",
      title: trending.title,
      source_url: null,
      source_platform: null,
      description: null,
      ingredients: [],
      steps: [],
      servings: null,
      prep_time_minutes: trending.prep_time_minutes ?? null,
      cook_time_minutes: trending.cook_time_minutes ?? null,
      tags: [],
      meal_type: (trending.meal_type as Recipe["meal_type"]) || "dinner",
      image_url: trending.image_url ?? null,
      notes: null,
      created_at: "",
      updated_at: "",
    };
    setExtraRecipes((prev) =>
      prev.some((r) => r.id === trending.recipeId) ? prev : [...prev, placeholder]
    );

    // Inject the placeholder into the My Recipes SWR cache too so the user's
    // library reflects the save *instantly*. We swap it for the real row once
    // the save POST returns (or remove it on failure).
    swrMutate(
      "supabase:recipes",
      (current: Recipe[] | undefined) => {
        const list = current ?? [];
        if (list.some((r) => r.id === trending.recipeId)) return list;
        return [placeholder, ...list];
      },
      false,
    );

    openAddSheetWithRecipe(selectedDate, trending.recipeId);

    if (pendingSaves.current.has(trending.recipeId)) return;
    setRecommendSavedIds((s) => new Set(s).add(trending.recipeId));

    const savePromise = (async () => {
      try {
        const detailRes = await fetch(`/api/recipes/${trending.recipeId}`);
        if (!detailRes.ok) throw new Error("Could not load recipe");
        const detail = await detailRes.json();
        const r = detail.recipe || detail;

        const res = await fetch("/api/recipes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: r.title,
            description: r.description,
            ingredients: r.ingredients,
            steps: r.steps,
            servings: r.servings,
            prep_time_minutes: r.prep_time_minutes,
            cook_time_minutes: r.cook_time_minutes,
            tags: r.tags,
            meal_type: r.meal_type,
            source_url: r.source_url,
            image_url: r.image_url,
            calories: r.calories,
            protein_g: r.protein_g,
            carbs_g: r.carbs_g,
            fat_g: r.fat_g,
            fiber_g: r.fiber_g,
            notes: "Saved from Meal Plan recommendations",
          }),
        });

        let savedId = trending.recipeId;
        let savedRecipe: Recipe | null = null;
        if (res.ok) {
          const data = await res.json();
          savedRecipe = (data.recipe as Recipe) ?? null;
          savedId = savedRecipe?.id || trending.recipeId;
        } else if (res.status === 409) {
          const data = await res.json();
          savedId = data.recipeId || trending.recipeId;
        } else {
          throw new Error("Save failed");
        }
        setSavedIdMap((m) => new Map(m).set(trending.recipeId, savedId));

        // Swap the placeholder (trending.recipeId) for the real saved row, so
        // My Recipes shows the canonical user-owned copy. For 409 we fall back
        // to a revalidation since the real row may already be in the cache or
        // need to be fetched.
        if (savedRecipe) {
          const realRow = savedRecipe;
          swrMutate(
            "supabase:recipes",
            (current: Recipe[] | undefined) => {
              const list = current ?? [];
              const filtered = list.filter((r) => r.id !== trending.recipeId);
              if (filtered.some((r) => r.id === realRow.id)) return filtered;
              return [realRow, ...filtered];
            },
            false,
          );
        } else {
          swrMutate(
            "supabase:recipes",
            (current: Recipe[] | undefined) =>
              (current ?? []).filter((r) => r.id !== trending.recipeId),
            false,
          );
          swrMutate("supabase:recipes");
        }
        return { savedId };
      } catch (err) {
        setRecommendSavedIds((s) => {
          const n = new Set(s);
          n.delete(trending.recipeId);
          return n;
        });
        // Revert the optimistic injection.
        swrMutate(
          "supabase:recipes",
          (current: Recipe[] | undefined) =>
            (current ?? []).filter((r) => r.id !== trending.recipeId),
          false,
        );
        throw err;
      }
    })();

    pendingSaves.current.set(trending.recipeId, savePromise);
    savePromise
      .catch(() => {})
      .finally(() => pendingSaves.current.delete(trending.recipeId));
  }, [savedIdMap, selectedDate]);

  // ─── Empty-state hero recipe (from library first, then trending) ────────────
  const heroRecipe = useMemo<{ recipe: Recipe; isTrending: boolean } | null>(() => {
    // First try: user's own library (prefer quick recipes with images)
    if (recipeLibrary.length > 0) {
      const withImage = recipeLibrary.filter((r) => r.image_url);
      const quick = withImage.filter((r) => {
        const t = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
        return t > 0 && t <= 30;
      });
      const pool = quick.length > 0 ? quick : withImage;
      if (pool.length > 0) {
        const offset = new Date(selectedDate).getDay();
        return { recipe: pool[offset % pool.length], isTrending: false };
      }
    }
    // Fallback: trending community recipes
    if (trending.length > 0) {
      const withImage = trending.filter((r: Record<string, unknown>) => r.image_url);
      if (withImage.length > 0) {
        const offset = new Date(selectedDate).getDay();
        const t = withImage[offset % withImage.length];
        // Convert trending to Recipe-like shape
        const asRecipe: Recipe = {
          id: t.recipeId,
          title: t.title,
          description: t.description || null,
          image_url: t.image_url,
          tags: t.tags || [],
          meal_type: t.meal_type || "dinner",
          servings: t.servings || null,
          prep_time_minutes: t.prep_time_minutes || null,
          cook_time_minutes: t.cook_time_minutes || null,
          source_url: t.source_url || null,
        } as Recipe;
        return { recipe: asRecipe, isTrending: true };
      }
    }
    return null;
  }, [recipeLibrary, trending, selectedDate]);

  // Save a trending recipe to library before planning it
  const [savingHeroRecipe, setSavingHeroRecipe] = useState(false);
  async function handleSaveAndPlanTrending(date: string, trendingRecipe: Recipe) {
    setSavingHeroRecipe(true);
    try {
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe: trendingRecipe }),
      });
      if (res.ok) {
        const data = await res.json();
        const savedId = data.recipe?.id || trendingRecipe.id;
        openAddSheetWithRecipe(date, savedId);
      }
    } catch {
      // Silent fail
    } finally {
      setSavingHeroRecipe(false);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function openAddSheet(date: string, mealTypes?: string[]) {
    setAddDate(date);
    setAddMealTypes(mealTypes);
    setReplacePlanId(undefined);
    setAddDefaultRecipeId(undefined);
    setAddSheetOpen(true);
  }

  function openAddSheetWithRecipe(date: string, recipeId: string) {
    setAddDate(date);
    setAddMealTypes(undefined);
    setReplacePlanId(undefined);
    setAddDefaultRecipeId(recipeId);
    setAddSheetOpen(true);
  }

  // ─── Suggested recipes for daily view ────────────────────────────────────────
  const suggestedRecipes = useMemo(() => {
    if (recipeLibrary.length === 0) return [];
    const plannedIds = new Set((byDate[selectedDate] || []).map((p) => p.recipe_id).filter(Boolean));
    const available = recipeLibrary.filter((r) => !plannedIds.has(r.id));
    // Rotate by day-of-week for variety without randomness
    const offset = new Date(selectedDate).getDay();
    return [...available.slice(offset), ...available.slice(0, offset)].slice(0, 6);
  }, [recipeLibrary, selectedDate, byDate]);

  function handleReplace(plan: MealPlan) {
    setAddDate(plan.planned_date);
    setAddMealTypes([plan.meal_type]);
    setReplacePlanId(plan.id);
    setAddSheetOpen(true);
  }

  async function handleAdd(recipeId: string, dates: string[], mealType: string, servings?: number) {
    let resolvedId = savedIdMap.get(recipeId) ?? recipeId;
    const pending = pendingSaves.current.get(recipeId);
    if (pending) {
      try {
        const { savedId } = await pending;
        resolvedId = savedId;
      } catch {
        return;
      }
    }
    await onAddMeal(resolvedId, dates, mealType, servings);
  }

  // ─── Render meal row ──────────────────────────────────────────────────────────
  function renderMealRow(plan: MealPlan, compact = false, done = false) {
    return (
      <MealRow
        key={plan.id}
        plan={plan}
        compact={compact}
        onTap={() => setPreviewPlan(plan)}
        onRemove={onRemove}
        done={done}
      />
    );
  }

  // ─── Daily view ───────────────────────────────────────────────────────────────
  function renderDailyView() {
    const selectedDay = new Date(selectedDate + "T12:00:00");
    const selectedDayLabel = selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const selectedPlans = sortMeals(byDate[selectedDate] || []);
    const otherDates = sortedDates.filter((d) => d !== selectedDate);

    return (
      <div
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleDaySwipeStart}
        onTouchMove={handleDaySwipeMove}
        onTouchEnd={handleDaySwipeEnd}
      >
        {/* ── Selected day hero ────────────────────────────────────────────── */}
        <div
          key={heroKey}
          className="mt-3"
          style={{ animation: "dayHeroIn 0.22s ease both" }}
        >
          {/* Meal cards */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: SURFACE, boxShadow: CARD_SHADOW }}
          >
            {selectedPlans.length > 0 && (
              <div>
                {selectedPlans.map((plan, i) => (
                  <div key={plan.id}>
                    {renderMealRow(plan)}
                  </div>
                ))}
              </div>
            )}

            {/* Add meal CTA — centered vertically when empty, bottom when has meals */}
            <div className={`px-3.5 py-3 ${selectedPlans.length === 0 ? "flex items-center justify-center" : ""}`} style={selectedPlans.length === 0 ? { minHeight: 80 } : undefined}>
              <button
                onClick={() => openAddSheet(selectedDate)}
                className={`flex items-center justify-center gap-2 py-1.5 rounded-xl text-[13px] font-medium transition-colors active:scale-[0.98] touch-manipulation ${selectedPlans.length === 0 ? "px-5" : "w-full"}`}
                style={{ background: "#eeecea", color: "#333" }}
              >
                <svg className="w-3.5 h-3.5" style={{ color: "#aaa" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add meal
              </button>
            </div>
          </div>
        </div>

        {/* ── My Recipes (unplanned from library) ────────────────────────── */}
        {suggestedRecipes.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em]" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.65, fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                My Recipes
              </p>
              <button
                onClick={() => router.push("/recipes")}
                className="text-[11px] font-semibold"
                style={{ color: ACCENT }}
              >
                See all &gt;
              </button>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            >
              {suggestedRecipes.map((recipe) => {
                const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
                return (
                  <div
                    key={recipe.id}
                    className="relative flex-shrink-0 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform group"
                    style={{ width: 170, height: 220, boxShadow: "0 4px 16px rgba(20,12,5,0.10)" }}
                    onClick={() => router.push(`/recipes/${recipe.id}`)}
                  >
                    {recipe.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={recipe.image_url} alt={recipe.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                        style={{
                          background:
                            "radial-gradient(circle at 35% 40%, var(--mustard, #E8A33D) 0%, transparent 45%), radial-gradient(circle at 70% 70%, var(--tomato, #E5462E) 0%, transparent 40%), var(--cream-warm, #EFE5D2)",
                        }}
                      >
                        <MealTypeIcon type={recipe.meal_type} className="opacity-50" size={36} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)" }} />
                    {/* Plus button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openAddSheetWithRecipe(selectedDate, recipe.id); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition-all active:scale-90 z-10"
                      aria-label="Add to meal plan"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6 z-10">
                      <h4
                        className="text-white line-clamp-2"
                        style={{
                          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                          fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
                          fontSize: "16px",
                          lineHeight: 1.18,
                          letterSpacing: "-0.015em",
                          textShadow: "0 1px 6px rgba(0,0,0,0.45)",
                        }}
                      >
                        {recipe.title}
                      </h4>
                      {totalTime > 0 && (
                        <span
                          className="inline-flex items-center gap-1 mt-1.5 text-white/85 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5"
                          style={{
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: "9.5px",
                            fontWeight: 500,
                            letterSpacing: "0.13em",
                            textTransform: "uppercase",
                          }}
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>
                          {totalTime} min
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Trending Recipes (community, horizontal scroll) ─────────── */}
        {recommendedRecipes.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em]" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.65, fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                Trending Recipes
              </p>
              <button
                onClick={() => router.push("/recipes?tab=discover")}
                className="text-[11px] font-semibold"
                style={{ color: ACCENT }}
              >
                See all &gt;
              </button>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            >
              {recommendedRecipes.map((recipe: { recipeId: string; title: string; image_url?: string | null; prep_time_minutes?: number | null; cook_time_minutes?: number | null; meal_type?: string }) => {
                const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
                return (
                  <div
                    key={recipe.recipeId}
                    className="relative flex-shrink-0 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform group"
                    style={{ width: 170, height: 220, boxShadow: "0 4px 16px rgba(20,12,5,0.10)" }}
                    onClick={() => router.push(`/recipes/${recipe.recipeId}`)}
                  >
                    {/* Image fills card */}
                    {recipe.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                        style={{
                          background:
                            "radial-gradient(circle at 35% 40%, var(--mustard, #E8A33D) 0%, transparent 45%), radial-gradient(circle at 70% 70%, var(--tomato, #E5462E) 0%, transparent 40%), var(--cream-warm, #EFE5D2)",
                        }}
                      >
                        <MealTypeIcon type={recipe.meal_type} className="opacity-50" size={36} strokeWidth={1.5} />
                      </div>
                    )}
                    {/* Dark gradient */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)",
                      }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); planTrending(recipe); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition-all active:scale-90 z-10"
                      aria-label="Add to meal plan"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {/* Title + time at bottom — Marco editorial voice */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6 z-10">
                      <h4
                        className="text-white line-clamp-2"
                        style={{
                          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                          fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
                          fontSize: "16px",
                          lineHeight: 1.18,
                          letterSpacing: "-0.015em",
                          textShadow: "0 1px 6px rgba(0,0,0,0.45)",
                        }}
                      >
                        {recipe.title}
                      </h4>
                      {totalTime > 0 && (
                        <span
                          className="inline-flex items-center gap-1 mt-1.5 text-white/85 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5"
                          style={{
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: "9.5px",
                            fontWeight: 500,
                            letterSpacing: "0.13em",
                            textTransform: "uppercase",
                          }}
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {totalTime} min
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  }

  // ─── Weekly view ──────────────────────────────────────────────────────────────
  function renderWeeklyView() {
    const GOAL = 14; // 2 meals/day × 7 days
    const planned = totalVisibleMeals;
    const progressPct = Math.min(100, Math.round((planned / GOAL) * 100));
    const mealTime = (p: MealPlan) => (p.recipe?.prep_time_minutes ?? 0) + (p.recipe?.cook_time_minutes ?? 0);
    const dayHasMeals = (dk: string) => (byDate[dk]?.length ?? 0) > 0;
    const isDayExpanded = (dk: string) => expandedOverride[dk] ?? dayHasMeals(dk);
    const anyExpanded = sortedDates.some((dk) => isDayExpanded(dk));
    const toggleDay = (dk: string) =>
      setExpandedOverride((prev) => ({ ...prev, [dk]: !(prev[dk] ?? dayHasMeals(dk)) }));
    const toggleAll = () => {
      const target = !anyExpanded;
      const next: Record<string, boolean> = {};
      sortedDates.forEach((dk) => { next[dk] = target; });
      setExpandedOverride(next);
    };

    const activeDragPlan = activeDragId ? mealPlans.find((p) => p.id === activeDragId) ?? null : null;

    return (
      <DndContext
        id="mealplan-dnd"
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
      <div className="space-y-2.5">

        {/* ── Progress header ─────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: SURFACE, boxShadow: CARD_SHADOW }}
        >
          <span
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 38, height: 38, background: planned >= GOAL ? "rgba(22,163,74,0.12)" : ACCENT_LIGHT }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={planned >= GOAL ? "#16a34a" : ACCENT} strokeWidth={2.2} strokeLinecap="round">
              <path d="M5 20V10M12 20V4M19 20v-6" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: TEXT_1 }}>
              You&apos;ve planned {planned} of {GOAL} meals
            </p>
            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(28,26,23,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: planned >= GOAL ? "#16a34a" : ACCENT }} />
            </div>
          </div>
          {onPlanThisWeek && (
            <button
              onClick={() => onPlanThisWeek?.()}
              className="flex items-center gap-1 pl-2 pr-2.5 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 flex-shrink-0"
              style={{ background: "var(--ink, #1C1A17)", color: "var(--cream, #F5EEE2)" }}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" />
              </svg>
              Plan my week
            </button>
          )}
        </div>

        {/* ── This Week + collapse-all ────────────────────────────────── */}
        <div className="flex items-center justify-between px-1 pt-1">
          <h2 style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: "18px", letterSpacing: "-0.015em", color: TEXT_1 }}>
            This Week
          </h2>
          <button onClick={toggleAll} className="flex items-center gap-1 text-[12.5px] font-semibold active:scale-95" style={{ color: TEXT_2 }}>
            {anyExpanded ? "Show fewer" : "Show more"}
            <svg className={`w-3.5 h-3.5 transition-transform ${anyExpanded ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l-7-7-7 7" />
            </svg>
          </button>
        </div>

        {/* ── Day cards ───────────────────────────────────────────────── */}
        {sortedDates.map((dateKey) => {
          const isToday = dateKey === today;
          const isPast = dateKey < today;
          const date = new Date(dateKey + "T12:00:00");
          const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
          const dayLong = date.toLocaleDateString("en-US", { weekday: "long" });
          const dayNum = date.getDate();
          const plans = sortMeals(byDate[dateKey] || []);
          const expanded = isDayExpanded(dateKey);
          const dayMin = plans.reduce((s, p) => s + mealTime(p), 0);
          const fullyPlanned = plans.length >= 2;

          const dayHasDietaryConflict =
            !isPast &&
            dietaryFilters.length > 0 &&
            plans.some((p) => {
              const ings = (p.recipe?.ingredients as Ingredient[] | undefined) ?? [];
              return ings.some((ing) => findDietaryConflicts(ing.name, dietaryFilters).length > 0);
            });

          return (
            <DroppableDay
              key={dateKey}
              dateKey={dateKey}
              domId={`day-${dateKey}`}
              className="rounded-2xl overflow-hidden"
              style={{ background: SURFACE, boxShadow: CARD_SHADOW }}
            >
              {/* Day header — tap to expand/collapse */}
              <button
                onClick={() => toggleDay(dateKey)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-black/[0.015]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] font-semibold flex-shrink-0" style={{ color: isPast ? "var(--ink-soft, #4A4742)" : TEXT_1, opacity: isPast ? 0.6 : 1 }}>
                    {weekday} {dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: ACCENT_LIGHT, color: ACCENT }}>Today</span>
                  )}
                  {dayHasDietaryConflict && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(232, 163, 61, 0.18)", color: "#8A6418" }} title="One of this day's recipes doesn't fit your dietary filters.">Needs swap</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-[12.5px]" style={{ color: TEXT_2 }}>
                    {plans.length === 0 ? "0 meals" : `${plans.length} ${plans.length === 1 ? "meal" : "meals"}${dayMin > 0 ? ` · ${dayMin} min` : ""}`}
                  </span>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: fullyPlanned ? "rgba(22,163,74,0.12)" : "rgba(28,26,23,0.05)", color: fullyPlanned ? "#16a34a" : TEXT_2 }}
                  >
                    <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </button>

              {/* Expanded: meals + actions + add */}
              {expanded && (
                <div className="px-3 pb-3 pt-0.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                  {plans.map((plan) => {
                    return (
                      <div key={plan.id} className="pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5 px-1" style={{ color: TEXT_2, fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                          {plan.meal_type}
                        </p>
                        <DraggableMeal id={plan.id} disabled={!!plan.owner_name}>
                          <button
                            onClick={() => setPreviewPlan(plan)}
                            className="w-full text-left active:scale-[0.99] transition-transform"
                          >
                            <MealVisual plan={plan} isPast={isPast} />
                          </button>
                        </DraggableMeal>
                        {/* Swap / Edit / Remove */}
                        {!plan.owner_name && (
                          <div className="flex items-center gap-2 mt-2">
                            <MealAction label="Swap" onClick={() => handleReplace(plan)} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />} />
                            <MealAction label="Edit" onClick={() => setEditingPlan(plan)} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />} />
                            <MealAction label="Remove" danger onClick={() => onRemove(plan.id)} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add a meal */}
                  {!isPast && (
                    <button
                      onClick={() => openAddSheet(dateKey)}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-colors active:scale-[0.98]"
                      style={{ border: `1px dashed ${BORDER}`, color: TEXT_2, background: "transparent" }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add a meal to {dayLong}
                    </button>
                  )}

                  {/* Coordinate (Today, 2+ meals) */}
                  {isToday && plans.length >= 2 && (
                    <button
                      onClick={() => setCoordinatePlans(plans)}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.98]"
                      style={{ background: "var(--ink, #1C1A17)", color: "var(--cream, #F5EEE2)" }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" d="M12 6v6l4 2" />
                      </svg>
                      Coordinate today&apos;s cooking
                    </button>
                  )}
                </div>
              )}
            </DroppableDay>
          );
        })}

      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragPlan ? <MealVisual plan={activeDragPlan} dragging /> : null}
      </DragOverlay>
      </DndContext>
    );
  }

  return (
    <>
      {/* ── Sticky navigation header ─────────────────────────────────────────── */}
      <div className="pt-3 pb-2" style={{ background: BG }}>

        {/* Row 1: week label (title style) + view dropdown + utility icons */}
        <div className="flex items-center justify-between mb-2">
          {/* Left: prev arrow + week label + next arrow + view dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeWeek(addDays(weekStart, -7))}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors active:bg-gray-100"
              style={{ color: TEXT_2 }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-3xl marco-h1 whitespace-nowrap" style={{ color: "#1C1A17" }}>{weekLabel}</span>
            <button
              onClick={() => changeWeek(addDays(weekStart, 7))}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors active:bg-gray-100"
              style={{ color: TEXT_2 }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* View dropdown — icon trigger. Same calendar icon + styling
                as the Grocery date-range trigger so the two pages look
                identical in the header. */}
            <div className="relative">
              <button
                onClick={() => setViewDropdownOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors active:bg-gray-100"
                style={{ color: viewDropdownOpen ? "#E5462E" : "#888", background: viewDropdownOpen ? "#ebebea" : "transparent" }}
                aria-label="Switch view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </button>
              {viewDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                  style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)", minWidth: 110 }}
                >
                  {(["daily", "weekly"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => { setViewMode(mode); setViewDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors hover:bg-gray-50 active:bg-gray-100"
                      style={{ color: viewMode === mode ? ACCENT : TEXT_1 }}
                    >
                      {mode === "daily" ? (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
                          <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18M9 10v10M15 10v10" />
                        </svg>
                      )}
                      {mode === "daily" ? "Daily" : "Weekly"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: jump to the grocery list for this plan */}
          <button
            onClick={() => router.push("/recipes?tab=grocery")}
            className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full transition-all active:scale-95 flex-shrink-0"
            style={{ background: "var(--cream-warm, #EFE5D2)", color: "#1C1A17" }}
            aria-label="View grocery list"
          >
            <GroceryIcon className="w-4 h-4" />
            <span className="text-[13px] font-semibold whitespace-nowrap">Grocery</span>
          </button>

        </div>

      </div>

      {/* ── Day strip — only in daily view, sits above the day's meals as
            content (not part of the sticky header chrome). Removed from the
            sticky header entirely so the date row matches Grocery's clean
            "< Apr 27 – May 3 > [calendar]" pattern. ──────────────────────── */}
      {viewMode === "daily" && (
        <div className="flex justify-between items-center w-full mb-3 mt-1">
          {sortedDates.map((dateKey) => {
            const d = new Date(dateKey + "T12:00:00");
            const abbr = d.toLocaleDateString("en-US", { weekday: "short" });
            const num = d.getDate();
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === today;
            return (
              <button
                key={dateKey}
                onClick={() => navigateToDate(dateKey)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform touch-manipulation"
                style={{ minWidth: 36 }}
              >
                <span
                  className="text-[9px] font-semibold tracking-wide"
                  style={{ color: isSelected ? ACCENT : isToday ? "#1C1A17" : "#c0c0be" }}
                >
                  {abbr.slice(0, 3)}
                </span>
                <div
                  className="rounded-full flex items-center justify-center transition-all duration-150 relative"
                  style={{
                    width: 38, height: 38,
                    ...(isSelected
                      ? { background: ACCENT }
                      : isToday
                        ? { background: "rgba(234,88,12,0.1)", border: "2px solid " + ACCENT }
                        : { background: "transparent" }),
                  }}
                >
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: isSelected ? "white" : isToday ? ACCENT : "#888" }}
                  >
                    {num}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {viewMode === "daily" ? renderDailyView() : renderWeeklyView()}

      {/* ── AddMealSheet ─────────────────────────────────────────────────────── */}
      <AddMealSheet
        isOpen={addSheetOpen}
        defaultDate={addDate}
        defaultMealTypes={addMealTypes}
        defaultRecipeId={addDefaultRecipeId}
        replacePlanId={replacePlanId}
        weekStart={weekStart}
        allRecipes={
          extraRecipes.length === 0
            ? recipeLibrary
            : [
                ...recipeLibrary,
                ...extraRecipes.filter((e) => !recipeLibrary.some((r) => r.id === e.id)),
              ]
        }
        weekPickIds={weekPickIds}
        weekPlans={weekMealPlans}
        onClose={() => { setAddSheetOpen(false); setExtraRecipes([]); }}
        onAdd={handleAdd}
        onRemove={onRemove}
        onPlanMultiple={(preSelectedId) => onPlanThisWeek?.(preSelectedId)}
      />

      {/* ── RecipePreviewSheet ───────────────────────────────────────────────── */}
      <RecipePreviewSheet
        isOpen={!!previewPlan}
        plan={previewPlan}
        onClose={() => setPreviewPlan(null)}
        onReplace={handleReplace}
        onEdit={onEditMeal ? (plan) => setEditingPlan(plan) : undefined}
        onDelete={previewPlan ? () => { onRemove(previewPlan.id); setPreviewPlan(null); } : undefined}
      />

      {/* ── CoordinationView ──────────────────────────────────────────── */}
      {coordinatePlans && (
        <CoordinationView
          plans={coordinatePlans}
          onClose={() => setCoordinatePlans(null)}
        />
      )}

      {/* ── EditMealSheet ─────────────────────────────────────────────────────── */}
      {onEditMeal && (
        <EditMealSheet
          isOpen={!!editingPlan}
          plan={editingPlan}
          allRecipes={recipeLibrary}
          onClose={() => setEditingPlan(null)}
          onSave={async (planId, updates) => {
            await onEditMeal(planId, updates);
            setEditingPlan(null);
          }}
        />
      )}
    </>
  );
}
