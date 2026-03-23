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
  const touchRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    movedX: number;
    didSwipe: boolean;
  } | null>(null);
  const swipedRef = useRef(false);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);

  function handleTouchStart(e: React.TouchEvent, planId: string) {
    const t = e.touches[0];
    touchRef.current = {
      id: planId,
      startX: t.clientX,
      startY: t.clientY,
      movedX: 0,
      didSwipe: false,
    };
    swipedRef.current = false;
  }

  function handleTouchMove(e: React.TouchEvent, planId: string) {
    const ref = touchRef.current;
    if (!ref || ref.id !== planId) return;
    const t = e.touches[0];
    const dx = t.clientX - ref.startX;
    const dy = t.clientY - ref.startY;
    // Cancel swipe if primarily vertical
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      touchRef.current = null;
      setSwipingId(null);
      setSwipeX(0);
      return;
    }
    const movedX = Math.min(0, dx);
    ref.movedX = movedX;
    if (Math.abs(movedX) > 8) {
      ref.didSwipe = true;
      swipedRef.current = true;
    }
    setSwipingId(planId);
    setSwipeX(movedX);
  }

  function handleTouchEnd(e: React.TouchEvent, plan: MealPlan) {
    const ref = touchRef.current;
    if (!ref || ref.id !== plan.id) return;
    touchRef.current = null;
    if (ref.didSwipe && ref.movedX < -60) {
      e.preventDefault();
      onRemove(plan.id);
      setSwipingId(null);
      setSwipeX(0);
      return;
    }
    setSwipingId(null);
    setSwipeX(0);
  }

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
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{weekLabel}</span>
          <button
            onClick={() => changeWeek(getMonday(new Date()))}
            className="text-[10px] text-orange-600 hover:text-orange-700 font-medium px-2 py-0.5 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => changeWeek(addDays(weekStart, 7))}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {totalVisibleMeals === 0 && (
        <div className="text-center py-14 space-y-3">
          <p className="text-3xl">🍽️</p>
          <p className="text-sm font-semibold text-gray-500">
            No meals planned for this week
          </p>
          <p className="text-xs text-gray-400">
            Tap + on any day or plan your whole week at once
          </p>
          {onPlanThisWeek && (
            <button
              onClick={onPlanThisWeek}
              className="mt-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 active:scale-[0.97] transition-all"
            >
              Plan your week
            </button>
          )}
        </div>
      )}

      {/* ── Day cards ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
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
              className={`rounded-2xl overflow-hidden border ${
                isToday ? "border-orange-200" : "border-gray-100"
              } bg-white`}
            >
              {/* Day header */}
              <div
                className={`flex items-center justify-between px-4 py-3 border-b ${
                  isToday
                    ? "border-orange-100 bg-orange-50/40"
                    : "border-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">
                    {weekday} {dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openAddSheet(dateKey)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors touch-manipulation"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>

              {/* Meal rows */}
              {plans.length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-3 italic">
                  Nothing planned
                </p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {plans.map((plan) => {
                    const isHousehold = !!plan.owner_name;
                    const colors =
                      MEAL_COLORS[plan.meal_type] || MEAL_COLORS.dinner;
                    const isSwiping = swipingId === plan.id;

                    return (
                      <div
                        key={plan.id}
                        className="relative overflow-hidden"
                        onTouchStart={
                          isHousehold
                            ? undefined
                            : (e) => handleTouchStart(e, plan.id)
                        }
                        onTouchMove={
                          isHousehold
                            ? undefined
                            : (e) => handleTouchMove(e, plan.id)
                        }
                        onTouchEnd={
                          isHousehold
                            ? undefined
                            : (e) => handleTouchEnd(e, plan)
                        }
                      >
                        {/* Red delete background (mobile swipe) */}
                        {!isHousehold && (
                          <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-end pr-4 pointer-events-none">
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Row content */}
                        <button
                          onClick={() => {
                            if (isHousehold) return;
                            if (swipedRef.current) {
                              swipedRef.current = false;
                              return;
                            }
                            setPreviewPlan(plan);
                          }}
                          style={{
                            transform: isSwiping
                              ? `translateX(${swipeX}px)`
                              : undefined,
                            transition: isSwiping
                              ? undefined
                              : "transform 0.2s ease",
                          }}
                          className={`group relative w-full flex items-center gap-3 px-4 py-3 border-l-4 ${colors.border} bg-white text-left ${
                            isHousehold
                              ? "bg-purple-50/30 cursor-default"
                              : "hover:bg-gray-50/80 active:bg-gray-100/80 cursor-pointer"
                          }`}
                        >
                          {/* Recipe thumbnail */}
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
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
                              className={`text-sm font-semibold line-clamp-1 ${
                                isHousehold
                                  ? "text-purple-800"
                                  : "text-gray-900"
                              }`}
                            >
                              {plan.recipe?.title || "Untitled"}
                            </p>
                            <p
                              className={`text-xs capitalize mt-0.5 ${
                                isHousehold
                                  ? "text-purple-400"
                                  : colors.label
                              }`}
                            >
                              {isHousehold
                                ? `${plan.meal_type} · ${plan.owner_name}`
                                : plan.meal_type}
                            </p>
                          </div>

                          {/* Desktop: hover trash icon */}
                          {!isHousehold && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove(plan.id);
                              }}
                              className="hidden sm:flex opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full hover:bg-red-50 items-center justify-center flex-shrink-0 transition-opacity touch-manipulation"
                              aria-label="Remove meal"
                            >
                              <svg
                                className="w-3.5 h-3.5 text-red-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}

                          {/* Mobile: chevron hint */}
                          {!isHousehold && (
                            <svg
                              className="sm:hidden w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-gray-400 transition-colors"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          )}
                        </button>
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
