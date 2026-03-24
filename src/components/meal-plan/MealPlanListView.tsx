"use client";

import { useState, useEffect, useRef } from "react";
import type { MealPlan, Recipe } from "@/types";
import AddMealSheet from "./AddMealSheet";
import RecipePreviewSheet from "./RecipePreviewSheet";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

const MEAL_PLACEHOLDER: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

const MEAL_COLORS: Record<string, { border: string; label: string }> = {
  breakfast: { border: "border-l-amber-400", label: "text-amber-600" },
  lunch: { border: "border-l-green-400", label: "text-green-600" },
  dinner: { border: "border-l-violet-400", label: "text-violet-600" },
  snack: { border: "border-l-orange-400", label: "text-orange-600" },
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

export default function MealPlanListView({
  mealPlans,
  householdPlans = [],
  onAddMeal,
  onRemove,
  recipePool,
  allRecipes = [],
  weekPickIds = [],
  weekStart: weekStartProp,
  onWeekChange,
  onPlanThisWeek,
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onAddMeal: (
    recipeId: string,
    dates: string[],
    mealType: string,
    servings?: number
  ) => Promise<void>;
  onRemove: (planId: string) => void;
  recipePool?: Recipe[];
  allRecipes?: Recipe[];
  weekPickIds?: string[];
  weekStart: Date;
  onWeekChange: (w: Date) => void;
  onPlanThisWeek?: () => void;
}) {
  // ─── Week navigation ─────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(weekStartProp);

  useEffect(() => {
    setWeekStart(weekStartProp);
  }, [weekStartProp]);

  function changeWeek(newWeek: Date) {
    setWeekStart(newWeek);
    onWeekChange(newWeek);
  }

  // ─── AddMealSheet state ───────────────────────────────────────────────────────
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addMealTypes, setAddMealTypes] = useState<string[] | undefined>(
    undefined
  );
  const [replacePlanId, setReplacePlanId] = useState<string | undefined>(
    undefined
  );

  // ─── RecipePreviewSheet state ─────────────────────────────────────────────────
  const [previewPlan, setPreviewPlan] = useState<MealPlan | null>(null);

  // ─── Swipe-to-delete (mobile) ─────────────────────────────────────────────────
  const DELETE_BTN_WIDTH = 80;
  const touchRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    locked: boolean; // true once we commit to horizontal swipe
    cancelled: boolean;
  } | null>(null);
  const swipedRef = useRef(false);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleTouchStart(e: React.TouchEvent, planId: string) {
    // Close any previously revealed row
    if (revealedId && revealedId !== planId) {
      setRevealedId(null);
    }
    const t = e.touches[0];
    touchRef.current = {
      id: planId,
      startX: t.clientX,
      startY: t.clientY,
      locked: false,
      cancelled: false,
    };
    swipedRef.current = false;
    setSwipingId(planId);
    setSwipeX(revealedId === planId ? -DELETE_BTN_WIDTH : 0);
  }

  function handleTouchMove(e: React.TouchEvent, planId: string) {
    const ref = touchRef.current;
    if (!ref || ref.id !== planId || ref.cancelled) return;
    const t = e.touches[0];
    const dx = t.clientX - ref.startX;
    const dy = t.clientY - ref.startY;

    // If we haven't committed yet, decide direction
    if (!ref.locked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        ref.cancelled = true;
        setSwipingId(null);
        setSwipeX(0);
        return;
      }
      if (Math.abs(dx) > 10) {
        ref.locked = true;
      } else {
        return;
      }
    }

    // Calculate position (start from revealed state if already open)
    const base = revealedId === planId ? -DELETE_BTN_WIDTH : 0;
    const raw = base + dx;
    // Clamp: can't go past delete button width, slight rubber-band past 0
    const clamped = raw > 0 ? raw * 0.2 : Math.max(raw, -DELETE_BTN_WIDTH * 1.5);
    swipedRef.current = true;
    setSwipeX(clamped);
  }

  function handleTouchEnd(_e: React.TouchEvent, plan: MealPlan) {
    const ref = touchRef.current;
    if (!ref || ref.id !== plan.id) return;
    touchRef.current = null;

    // Snap decision: if past halfway, reveal; otherwise close
    if (swipeX < -DELETE_BTN_WIDTH * 0.4) {
      setRevealedId(plan.id);
      setSwipeX(-DELETE_BTN_WIDTH);
    } else {
      setRevealedId(null);
      setSwipeX(0);
    }
    setSwipingId(null);
  }

  function handleDeleteTap(planId: string) {
    if (confirmingId === planId) {
      // Second tap — actually delete
      onRemove(planId);
      setConfirmingId(null);
      setRevealedId(null);
      setSwipeX(0);
    } else {
      // First tap — ask to confirm
      setConfirmingId(planId);
    }
  }

  // Reset confirm state when revealed row changes
  useEffect(() => {
    if (!revealedId) setConfirmingId(null);
  }, [revealedId]);

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const today = formatDateKey(new Date());

  const sortedDates = Array.from({ length: 7 }, (_, i) =>
    formatDateKey(addDays(weekStart, i))
  );

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = (() => {
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const startMonth = weekStart.toLocaleDateString("en-US", { month: "long" });
    const endMonth = weekEnd.toLocaleDateString("en-US", { month: "long" });
    const year = weekEnd.getFullYear();
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  })();

  const byDate: Record<string, MealPlan[]> = {};
  for (const plan of [...mealPlans, ...householdPlans]) {
    if (!sortedDates.includes(plan.planned_date)) continue;
    if (!byDate[plan.planned_date]) byDate[plan.planned_date] = [];
    byDate[plan.planned_date].push(plan);
  }

  const totalVisibleMeals = Object.values(byDate).reduce(
    (s, p) => s + p.length,
    0
  );

  // Current-week plans passed to AddMealSheet for "already planned" filtering
  const weekMealPlans = mealPlans.filter((p) =>
    sortedDates.includes(p.planned_date)
  );

  // Recipe library passed to AddMealSheet
  const recipeLibrary =
    allRecipes.length > 0 ? allRecipes : recipePool ?? [];

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function openAddSheet(date: string, mealTypes?: string[]) {
    setAddDate(date);
    setAddMealTypes(mealTypes);
    setReplacePlanId(undefined);
    setAddSheetOpen(true);
  }

  function handleReplace(plan: MealPlan) {
    setAddDate(plan.planned_date);
    setAddMealTypes([plan.meal_type]);
    setReplacePlanId(plan.id);
    setAddSheetOpen(true);
  }

  async function handleAdd(
    recipeId: string,
    dates: string[],
    mealType: string,
    servings?: number
  ): Promise<void> {
    await onAddMeal(recipeId, dates, mealType, servings);
  }

  return (
    <>
      {/* ── Week navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeWeek(addDays(weekStart, -7))}
          className="w-9 h-9 flex items-center justify-center rounded-2xl transition-colors"
          style={{ background: "white", color: "#a09890", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "#1a1410" }}>{weekLabel}</span>
          <button
            onClick={() => changeWeek(getMonday(new Date()))}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors"
            style={{ background: "#fff7ed", color: "#f97316" }}
          >
            Today
          </button>
        </div>
        <button
          onClick={() => changeWeek(addDays(weekStart, 7))}
          className="w-9 h-9 flex items-center justify-center rounded-2xl transition-colors"
          style={{ background: "white", color: "#a09890", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {totalVisibleMeals === 0 && (
        <div className="text-center py-14 space-y-3 rounded-3xl bg-white mb-3" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <p className="text-3xl">🍽️</p>
          <p className="text-sm font-bold" style={{ color: "#1a1410" }}>
            No meals planned for this week
          </p>
          <p className="text-xs" style={{ color: "#a09890" }}>
            Tap + on any day or plan your whole week at once
          </p>
          {onPlanThisWeek && (
            <button
              onClick={onPlanThisWeek}
              className="mt-2 px-5 py-2.5 text-white text-sm font-bold rounded-full active:scale-[0.97] transition-all"
              style={{ background: "#1a1410" }}
            >
              Plan your week
            </button>
          )}
        </div>
      )}

      {/* ── Day cards ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {sortedDates.map((dateKey, di) => {
          const isToday = dateKey === today;
          const date = new Date(dateKey + "T12:00:00");
          const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = date.getDate();
          const plans = sortMeals(byDate[dateKey] || []);

          return (
            <div
              key={dateKey}
              id={`day-${dateKey}`}
              className="rounded-3xl overflow-hidden bg-white"
              style={{
                boxShadow: isToday ? "0 2px 16px rgba(249,115,22,0.12)" : "0 2px 12px rgba(0,0,0,0.05)",
                border: isToday ? "1.5px solid #fed7aa" : "1.5px solid transparent",
                animation: `cardPop 0.4s ease ${di * 35}ms both`,
              }}
            >
              {/* Day header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={isToday
                  ? { background: "linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)", borderBottom: "1px solid #fed7aa" }
                  : { background: "white", borderBottom: "1px solid #f5f0eb" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-black" style={{ color: "#1a1410" }}>
                    {weekday} {dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fed7aa", color: "#c2410c" }}>
                      Today
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openAddSheet(dateKey)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors touch-manipulation"
                  style={{ background: "#f5f0eb", color: "#a09890" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Meal rows */}
              {plans.length === 0 ? (
                <p className="text-xs text-center py-3 italic" style={{ color: "#c4bdb8" }}>
                  Nothing planned
                </p>
              ) : (
                <div style={{ background: "white" }}>
                  {plans.map((plan) => {
                    const isHousehold = !!plan.owner_name;
                    const colors =
                      MEAL_COLORS[plan.meal_type] || MEAL_COLORS.dinner;
                    const isSwiping = swipingId === plan.id;

                    const isRevealed = revealedId === plan.id;
                    const isConfirming = confirmingId === plan.id;
                    const isActive = isSwiping || isRevealed;
                    const currentX = isSwiping ? swipeX : isRevealed ? -DELETE_BTN_WIDTH : 0;

                    return (
                      <div
                        key={plan.id}
                        className="relative overflow-hidden"
                        style={{ borderTop: "1px solid #f5f0eb" }}
                        onTouchStart={(e) => handleTouchStart(e, plan.id)}
                        onTouchMove={(e) => handleTouchMove(e, plan.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, plan)}
                      >
                        {/* Delete button revealed behind row */}
                        <button
                          onClick={() => handleDeleteTap(plan.id)}
                          className={`sm:hidden absolute inset-y-0 right-0 flex items-center justify-center transition-colors ${
                            isConfirming ? "bg-red-600" : "bg-red-500"
                          }`}
                          style={{ width: `${DELETE_BTN_WIDTH}px` }}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="text-[10px] font-semibold text-white">
                              {isConfirming ? "Confirm?" : "Delete"}
                            </span>
                          </div>
                        </button>

                        {/* Row content */}
                        <div
                          onClick={() => {
                            if (swipedRef.current) {
                              swipedRef.current = false;
                              return;
                            }
                            if (isRevealed) {
                              setRevealedId(null);
                              return;
                            }
                            setPreviewPlan(plan);
                          }}
                          style={{
                            transform: `translateX(${currentX}px)`,
                            transition: isSwiping ? undefined : "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
                            background: isHousehold ? "rgba(245, 243, 255, 0.5)" : "white",
                          }}
                          className={`group relative w-full flex items-center gap-3 px-4 py-3 border-l-4 ${colors.border} cursor-pointer text-left`}
                        >
                          {/* Recipe thumbnail */}
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#f5f0eb" }}>
                            {plan.recipe?.image_url ? (
                              <img
                                src={plan.recipe.image_url}
                                alt={plan.recipe?.title || ""}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm">
                                {MEAL_PLACEHOLDER[plan.meal_type] || "🍴"}
                              </span>
                            )}
                          </div>

                          {/* Name + type */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-bold line-clamp-1"
                              style={{ color: isHousehold ? "#6d28d9" : "#1a1410" }}
                            >
                              {plan.recipe?.title || "Untitled"}
                            </p>
                            <p
                              className={`text-xs capitalize mt-0.5 ${isHousehold ? "text-purple-400" : colors.label}`}
                            >
                              {isHousehold
                                ? `${plan.meal_type} · ${plan.owner_name}`
                                : plan.meal_type}
                            </p>
                          </div>

                          {/* Desktop: hover trash icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(plan.id);
                            }}
                            className="hidden sm:flex opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full hover:bg-red-50 items-center justify-center flex-shrink-0 transition-opacity touch-manipulation"
                            aria-label="Remove meal"
                          >
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>

                          {/* Mobile: chevron hint (hidden when swiped) */}
                          {!isActive && (
                            <svg
                              className="sm:hidden w-4 h-4 flex-shrink-0 transition-colors"
                              style={{ color: isHousehold ? "#ddd6fe" : "#e8e0d8" }}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── AddMealSheet ─────────────────────────────────────────────────────── */}
      <AddMealSheet
        isOpen={addSheetOpen}
        defaultDate={addDate}
        defaultMealTypes={addMealTypes}
        replacePlanId={replacePlanId}
        weekStart={weekStart}
        allRecipes={recipeLibrary}
        weekPickIds={weekPickIds}
        weekPlans={weekMealPlans}
        onClose={() => setAddSheetOpen(false)}
        onAdd={handleAdd}
        onRemove={onRemove}
      />

      {/* ── RecipePreviewSheet ───────────────────────────────────────────────── */}
      <RecipePreviewSheet
        isOpen={!!previewPlan}
        plan={previewPlan}
        onClose={() => setPreviewPlan(null)}
        onReplace={handleReplace}
      />
    </>
  );
}
