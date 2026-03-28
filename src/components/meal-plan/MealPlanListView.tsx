"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import type { MealPlan, Recipe } from "@/types";
import AddMealSheet from "./AddMealSheet";
import RecipePreviewSheet from "./RecipePreviewSheet";
import EditMealSheet from "./EditMealSheet";

// ─── Theme ────────────────────────────────────────────────────────────────────
const ACCENT = "#e8530a";          // slightly calmer orange
const ACCENT_LIGHT = "#fff4ec";
const BG = "#f4f3f1";
const SURFACE = "#ffffff";
const TEXT_1 = "#141414";          // deeper near-black
const TEXT_2 = "#888";
const BORDER = "#e8e8e5";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🥞",
  lunch:     "🥗",
  dinner:    "🍽️",
  snack:     "🍎",
};

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
  swipeX,
  isActive,
  isRevealed,
  isConfirming,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onDeleteTap,
  compact = false,
}: {
  plan: MealPlan;
  onTap: () => void;
  onRemove: (id: string) => void;
  swipeX: number;
  isActive: boolean;
  isRevealed: boolean;
  isConfirming: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onDeleteTap: () => void;
  compact?: boolean;
}) {
  const DELETE_BTN_WIDTH = 80;
  const currentX = isActive ? swipeX : isRevealed ? -DELETE_BTN_WIDTH : 0;

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Delete button */}
      <button
        onClick={onDeleteTap}
        className={`sm:hidden absolute inset-y-0 right-0 flex items-center justify-center transition-colors ${
          isConfirming ? "bg-red-600" : "bg-red-500"
        }`}
        style={{ width: `${DELETE_BTN_WIDTH}px` }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-[10px] font-semibold text-white">{isConfirming ? "Sure?" : "Delete"}</span>
        </div>
      </button>

      {/* Row content */}
      {compact ? (
        /* ── Compact layout (weekly view): small left thumbnail ── */
        <div
          onClick={() => { if (isRevealed) return; onTap(); }}
          style={{
            transform: `translateX(${currentX}px)`,
            transition: isActive ? undefined : "transform 0.3s cubic-bezier(0.25,1,0.5,1)",
            background: SURFACE,
          }}
          className="group relative w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer text-left hover:bg-gray-50/40 active:bg-gray-100/40"
        >
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#f0f0ee" }}>
            {plan.recipe?.image_url
              ? <img src={plan.recipe.image_url} alt={plan.recipe?.title || ""} className="w-full h-full object-cover" />
              : <span className="text-sm">{MEAL_EMOJI[plan.meal_type] || "🍴"}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold line-clamp-1" style={{ color: plan.owner_name ? "#888" : TEXT_1 }}>
              {plan.recipe?.title || "Untitled"}
            </p>
            <p className="text-[11px] mt-0.5 capitalize font-medium" style={{ color: "#b8b8b8" }}>
              {plan.owner_name ? `${plan.meal_type} · ${plan.owner_name}` : plan.meal_type}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(plan.id); }}
            className="hidden sm:flex opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full hover:bg-red-50 items-center justify-center flex-shrink-0 transition-opacity"
            aria-label="Remove meal"
          >
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          {!isActive && !isRevealed && (
            <svg className="sm:hidden w-3 h-3 flex-shrink-0" style={{ color: "#d8d8d6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      ) : (
        /* ── Full layout (daily view): large left image ── */
        <div
          onClick={() => { if (isRevealed) return; onTap(); }}
          style={{
            transform: `translateX(${currentX}px)`,
            transition: isActive ? undefined : "transform 0.3s cubic-bezier(0.25,1,0.5,1)",
            background: SURFACE,
          }}
          className="group relative w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer text-left hover:bg-gray-50/30 active:bg-gray-100/30"
        >
          {/* Large left image */}
          <div
            className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: "#eeecea" }}
          >
            {plan.recipe?.image_url
              ? <img src={plan.recipe.image_url} alt={plan.recipe?.title || ""} className="w-full h-full object-cover" />
              : <span className="text-2xl opacity-50 select-none">{MEAL_EMOJI[plan.meal_type] || "🍴"}</span>}
          </div>

          {/* Text */}
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
      )}
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
  onShowInsights,
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onAddMeal: (recipeId: string, dates: string[], mealType: string, servings?: number) => Promise<void>;
  onRemove: (planId: string) => void;
  onEditMeal?: (planId: string, updates: { meal_type?: string; recipe_id?: string; servings?: number }) => Promise<void>;
  recipePool?: Recipe[];
  onShowInsights?: () => void;
  allRecipes?: Recipe[];
  weekPickIds?: string[];
  weekStart: Date;
  onWeekChange: (w: Date) => void;
  onPlanThisWeek?: () => void;
}) {
  // ─── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  // ─── Week & day state ────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(weekStartProp);
  const today = formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  // Animate key — increment on day change to replay animation
  const [heroKey, setHeroKey] = useState(0);
  // Suggested recipe carousel index (resets on day change)
  const [suggestedIdx, setSuggestedIdx] = useState(0);

  useEffect(() => { setWeekStart(weekStartProp); }, [weekStartProp]);
  useEffect(() => { setSuggestedIdx(0); }, [selectedDate]);

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
      startedOnMealRow: !!touchRef.current || suggestedCardIsTouching.current,
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
    if (!sortedDates.includes(plan.planned_date)) continue;
    if (!byDate[plan.planned_date]) byDate[plan.planned_date] = [];
    byDate[plan.planned_date].push(plan);
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

  // ─── Swipe-to-delete ─────────────────────────────────────────────────────────
  const DELETE_BTN_WIDTH = 80;
  const touchRef = useRef<{ id: string; startX: number; startY: number; locked: boolean; cancelled: boolean } | null>(null);
  const swipedRef = useRef(false);
  // Suggested card swipe refs (for gesture isolation from day-swipe)
  const suggestedCardTouchRef = useRef<{ startX: number; startY: number; locked: boolean; cancelled: boolean } | null>(null);
  const suggestedCardIsTouching = useRef(false);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleTouchStart(e: React.TouchEvent, planId: string) {
    if (revealedId && revealedId !== planId) setRevealedId(null);
    const t = e.touches[0];
    touchRef.current = { id: planId, startX: t.clientX, startY: t.clientY, locked: false, cancelled: false };
    swipedRef.current = false;
    setSwipingId(planId);
    setSwipeX(revealedId === planId ? -DELETE_BTN_WIDTH : 0);
  }

  function handleTouchMove(e: React.TouchEvent, planId: string) {
    const ref = touchRef.current;
    if (!ref || ref.id !== planId || ref.cancelled) return;
    const t = e.touches[0];
    const dx = t.clientX - ref.startX, dy = t.clientY - ref.startY;
    if (!ref.locked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { ref.cancelled = true; setSwipingId(null); setSwipeX(0); return; }
      if (Math.abs(dx) > 10) ref.locked = true; else return;
    }
    const base = revealedId === planId ? -DELETE_BTN_WIDTH : 0;
    const raw = base + dx;
    const clamped = raw > 0 ? raw * 0.2 : Math.max(raw, -DELETE_BTN_WIDTH * 1.5);
    swipedRef.current = true;
    setSwipeX(clamped);
  }

  function handleTouchEnd(_e: React.TouchEvent, plan: MealPlan) {
    const ref = touchRef.current;
    if (!ref || ref.id !== plan.id) return;
    touchRef.current = null;
    if (swipeX < -DELETE_BTN_WIDTH * 0.4) { setRevealedId(plan.id); setSwipeX(-DELETE_BTN_WIDTH); }
    else { setRevealedId(null); setSwipeX(0); }
    setSwipingId(null);
  }

  function handleDeleteTap(planId: string) {
    if (confirmingId === planId) { onRemove(planId); setConfirmingId(null); setRevealedId(null); setSwipeX(0); }
    else setConfirmingId(planId);
  }

  useEffect(() => { if (!revealedId) setConfirmingId(null); }, [revealedId]);

  // ─── Suggested card swipe handlers ───────────────────────────────────────────
  function handleSuggestedTouchStart(e: React.TouchEvent) {
    suggestedCardIsTouching.current = true;
    suggestedCardTouchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      locked: false,
      cancelled: false,
    };
  }
  function handleSuggestedTouchMove(e: React.TouchEvent) {
    const ref = suggestedCardTouchRef.current;
    if (!ref || ref.cancelled) return;
    const dx = e.touches[0].clientX - ref.startX;
    const dy = e.touches[0].clientY - ref.startY;
    if (!ref.locked) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { ref.cancelled = true; return; }
      if (Math.abs(dx) > 8) ref.locked = true; else return;
    }
    // Stop propagation so day-swipe doesn't fire
    e.stopPropagation();
  }
  function handleSuggestedTouchEnd(e: React.TouchEvent) {
    suggestedCardIsTouching.current = false;
    const ref = suggestedCardTouchRef.current;
    suggestedCardTouchRef.current = null;
    if (!ref || ref.cancelled || !ref.locked) return;
    const dx = e.changedTouches[0].clientX - ref.startX;
    if (Math.abs(dx) < 40) return;
    const n = suggestedRecipes.length;
    if (n === 0) return;
    if (dx < 0) setSuggestedIdx((i) => (i + 1) % n);
    else setSuggestedIdx((i) => (i - 1 + n) % n);
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
    await onAddMeal(recipeId, dates, mealType, servings);
  }

  // ─── Render helpers for meal rows with swipe ──────────────────────────────────
  function renderMealRow(plan: MealPlan, compact = false) {
    const isSwiping = swipingId === plan.id;
    const isRevealed = revealedId === plan.id;
    return (
      <MealRow
        key={plan.id}
        plan={plan}
        compact={compact}
        swipeX={isSwiping ? swipeX : isRevealed ? -DELETE_BTN_WIDTH : 0}
        isActive={isSwiping}
        isRevealed={isRevealed}
        isConfirming={confirmingId === plan.id}
        onTap={() => {
          if (swipedRef.current) { swipedRef.current = false; return; }
          setPreviewPlan(plan);
        }}
        onRemove={onRemove}
        onTouchStart={(e) => handleTouchStart(e, plan.id)}
        onTouchMove={(e) => handleTouchMove(e, plan.id)}
        onTouchEnd={(e) => handleTouchEnd(e, plan)}
        onDeleteTap={() => handleDeleteTap(plan.id)}
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
        {/* ── Week nav + Day strip ─────────────────────────────────────────── */}
        <div className="space-y-2">

        {/* Week navigator with view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => changeWeek(addDays(weekStart, -7))}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-gray-100"
              style={{ color: TEXT_2 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold px-1" style={{ color: TEXT_1 }}>{weekLabel}</span>
            <button
              onClick={() => changeWeek(addDays(weekStart, 7))}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-gray-100"
              style={{ color: TEXT_2 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "#ebebea" }}>
            <button
              onClick={() => setViewMode("daily")}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
              style={viewMode === "daily"
                ? { background: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.08)", color: ACCENT }
                : { background: "transparent", color: "#bbb" }}
              aria-label="Day view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
                <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
              style={viewMode === "weekly"
                ? { background: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.08)", color: ACCENT }
                : { background: "transparent", color: "#bbb" }}
              aria-label="Week view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18M9 10v10M15 10v10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Day strip — full width, evenly spaced */}
        <div className="flex justify-between items-center w-full">
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
                {/* Day abbreviation */}
                <span
                  className="text-[9px] font-semibold tracking-wide"
                  style={{ color: isSelected ? ACCENT : isToday ? ACCENT : "#c0c0be" }}
                >
                  {abbr.slice(0, 3)}
                </span>
                {/* Circle */}
                <div
                  className="rounded-full flex items-center justify-center transition-all duration-150"
                  style={{
                    width: 38, height: 38,
                    ...(isSelected
                      ? { background: ACCENT }
                      : isToday
                        ? { background: "transparent", boxShadow: `0 0 0 1.5px ${ACCENT}` }
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

        </div>{/* end week nav + strip */}

        {/* ── Selected day hero ────────────────────────────────────────────── */}
        <div
          key={heroKey}
          className="mt-5"
          style={{ animation: "dayHeroIn 0.22s ease both" }}
        >
          {/* Meal cards */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: SURFACE, boxShadow: CARD_SHADOW }}
          >
            {selectedPlans.length === 0 ? (
              <div className="flex flex-col items-center py-5 px-6">
                <p className="text-sm" style={{ color: "#ccc" }}>Nothing planned</p>
              </div>
            ) : (
              <div>
                {selectedPlans.map((plan, i) => (
                  <div key={plan.id}>
                    {renderMealRow(plan)}
                  </div>
                ))}
              </div>
            )}

            {/* Add meal CTA */}
            <div className="px-3.5 py-3">
              <button
                onClick={() => openAddSheet(selectedDate)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-colors active:scale-[0.98] touch-manipulation"
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


        {/* ── Suggested for you (up to 3 cards) ───────────────────────────── */}
        {suggestedRecipes.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: "#c0c0be" }}>
              Suggested for you
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: SURFACE, boxShadow: CARD_SHADOW }}
            >
              {suggestedRecipes.slice(0, 3).map((recipe, i) => {
                const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
                return (
                  <div key={recipe.id}>
                    <div
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer active:bg-gray-50/40 transition-colors"
                      onClick={() => openAddSheetWithRecipe(selectedDate, recipe.id)}
                    >
                      {/* Image */}
                      <div
                        className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ background: "#f0f0ee" }}
                      >
                        {recipe.image_url
                          ? <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                          : <span className="text-lg opacity-40 select-none">{MEAL_EMOJI[recipe.meal_type as keyof typeof MEAL_EMOJI] || "🍳"}</span>}
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold line-clamp-1 leading-snug" style={{ color: TEXT_1 }}>
                          {recipe.title}
                        </p>
                        {totalTime > 0 && (
                          <p className="text-[11px] mt-0.5 font-medium" style={{ color: "#c0c0be" }}>
                            {totalTime} min
                          </p>
                        )}
                      </div>
                      {/* Add button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openAddSheetWithRecipe(selectedDate, recipe.id); }}
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                        style={{ background: "#f0f0ee" }}
                        aria-label="Add to meal plan"
                      >
                        <svg className="w-3 h-3" style={{ color: "#999" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Build plan CTA (empty week) ─────────────────────────────────── */}
        {totalVisibleMeals === 0 && onPlanThisWeek && (
          <div className="flex flex-col items-center py-8 space-y-3">
            <p className="text-sm font-medium" style={{ color: TEXT_2 }}>No meals planned this week</p>
            <button
              onClick={onPlanThisWeek}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97]"
              style={{ background: ACCENT, color: "white" }}
            >
              Plan your week
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Weekly view ──────────────────────────────────────────────────────────────
  function renderWeeklyView() {
    return (
      <div className="space-y-2.5">
        {/* Week nav */}
        <div className="flex items-center justify-between mb-1">
          {/* Left: prev + week label + today pill + next */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => changeWeek(addDays(weekStart, -7))}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-gray-100"
              style={{ color: TEXT_2 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold px-1" style={{ color: TEXT_1 }}>{weekLabel}</span>
            <button
              onClick={() => changeWeek(addDays(weekStart, 7))}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-gray-100"
              style={{ color: TEXT_2 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Right: Today pill + icon toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { changeWeek(getMonday(new Date())); setSelectedDate(today); }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors"
              style={{ background: ACCENT_LIGHT, color: ACCENT }}
            >
              Today
            </button>
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "#ebebea" }}>
              <button
                onClick={() => setViewMode("daily")}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
                style={viewMode === "daily"
                  ? { background: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.08)", color: ACCENT }
                  : { background: "transparent", color: "#bbb" }}
                aria-label="Day view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
                  <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("weekly")}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
                style={viewMode === "weekly"
                  ? { background: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.08)", color: ACCENT }
                  : { background: "transparent", color: "#bbb" }}
                aria-label="Week view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18M9 10v10M15 10v10" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Insights button */}
        {onShowInsights && (
          <div className="flex justify-end -mt-1 mb-1">
            <button
              onClick={onShowInsights}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors active:scale-95"
              style={{ background: ACCENT_LIGHT, color: ACCENT }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Insights
            </button>
          </div>
        )}

        {/* Empty state */}
        {totalVisibleMeals === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-2xl">🍽️</p>
            <p className="text-sm font-semibold" style={{ color: TEXT_2 }}>No meals planned this week</p>
            {onPlanThisWeek && (
              <button
                onClick={onPlanThisWeek}
                className="mt-1 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97]"
                style={{ background: ACCENT, color: "white" }}
              >
                Plan your week
              </button>
            )}
          </div>
        )}

        {/* Day cards */}
        {sortedDates.map((dateKey) => {
          const isToday = dateKey === today;
          const date = new Date(dateKey + "T12:00:00");
          const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = date.getDate();
          const plans = sortMeals(byDate[dateKey] || []);

          return (
            <div
              key={dateKey}
              id={`day-${dateKey}`}
              className="rounded-2xl overflow-hidden"
              style={{
                background: SURFACE,
                boxShadow: CARD_SHADOW,
              }}
            >
              {/* Day header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: isToday ? "#fffbf8" : "#fafaf9" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: TEXT_1 }}>{weekday} {dayNum}</span>
                  {isToday && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: ACCENT_LIGHT, color: ACCENT }}>
                      Today
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openAddSheet(dateKey)}
                  className="w-7 h-7 rounded-full border flex items-center justify-center transition-colors touch-manipulation"
                  style={{ borderColor: BORDER, color: TEXT_2 }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Meals */}
              {plans.length === 0 ? (
                <p className="text-[11px] text-center py-3" style={{ color: "#d0d0ce" }}>Nothing planned</p>
              ) : (
                <div>
                  {plans.map((plan, i) => (
                    <div key={plan.id}>
                      {renderMealRow(plan, true)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>

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
        allRecipes={recipeLibrary}
        weekPickIds={weekPickIds}
        weekPlans={weekMealPlans}
        onClose={() => setAddSheetOpen(false)}
        onAdd={handleAdd}
        onRemove={onRemove}
        onPlanMultiple={onPlanThisWeek}
      />

      {/* ── RecipePreviewSheet ───────────────────────────────────────────────── */}
      <RecipePreviewSheet
        isOpen={!!previewPlan}
        plan={previewPlan}
        onClose={() => setPreviewPlan(null)}
        onReplace={handleReplace}
        onEdit={onEditMeal ? (plan) => setEditingPlan(plan) : undefined}
      />

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
