"use client";

import { useState, useEffect, useCallback } from "react";
import type { MealPlan, Recipe } from "@/types";
import MealPlanListView from "./MealPlanListView";
import NotificationSheet from "@/components/notifications/NotificationSheet";

export default function ScheduleScreen({
  mealPlans,
  householdPlans,
  selectedPool,
  allRecipes,
  currentWeekPickIds,
  onAddMeal,
  onRemoveMeal,
  onEditMeal,
  onPlanThisWeek,
  onShowInsights,
  calendarWeek,
  onCalendarWeekChange,
}: {
  mealPlans: MealPlan[];
  householdPlans: MealPlan[];
  selectedPool: Recipe[];
  allRecipes: Recipe[];
  currentWeekPickIds: string[];
  onAddMeal: (recipeId: string, dates: string[], mealType: string, servings?: number) => Promise<void>;
  onRemoveMeal: (planId: string) => void;
  onEditMeal?: (planId: string, updates: { meal_type?: string; recipe_id?: string; servings?: number }) => Promise<void>;
  onPlanThisWeek: () => void;
  onShowInsights: () => void;
  calendarWeek: Date;
  onCalendarWeekChange: (w: Date) => void;
}) {
  const pool = selectedPool.length > 0 ? selectedPool : undefined;

  // Count meals for the current calendar week
  const weekStartStr = calendarWeek.toISOString().split("T")[0];
  const weekEndDate = new Date(calendarWeek);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = weekEndDate.toISOString().split("T")[0];
  const weekMealCount = mealPlans.filter(
    (p) => p.planned_date >= weekStartStr && p.planned_date <= weekEndStr
  ).length;

  // Mobile-only notification bell state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return (
    <div style={{ background: "#f4f3f1", minHeight: "100%" }}>
      {/* Header — matches Recipes page style exactly */}
      <div className="sticky top-0 z-10 px-4 pt-5 pb-0" style={{ background: "#f4f3f1" }}>
        <div className="flex items-center justify-between max-w-3xl mx-auto mb-2">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>
              Meal Plan
            </h1>
            {weekMealCount > 0 && (
              <p className="text-xs font-medium mt-1" style={{ color: "#999" }}>
                {weekMealCount} meal{weekMealCount !== 1 ? "s" : ""} this week
              </p>
            )}
          </div>

          {/* Notification bell — mobile only */}
          <button
            onClick={() => setShowNotifications(true)}
            className="sm:hidden relative w-9 h-9 rounded-full flex items-center justify-center transition-colors active:bg-gray-100"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-28 max-w-3xl mx-auto">
        <MealPlanListView
          mealPlans={mealPlans}
          householdPlans={householdPlans}
          onAddMeal={onAddMeal}
          onRemove={onRemoveMeal}
          onEditMeal={onEditMeal}
          recipePool={pool}
          allRecipes={allRecipes}
          weekPickIds={currentWeekPickIds}
          weekStart={calendarWeek}
          onWeekChange={onCalendarWeekChange}
          onPlanThisWeek={onPlanThisWeek}
          onShowInsights={onShowInsights}
        />
      </div>

      {/* Mobile notification sheet */}
      <NotificationSheet
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadChange={setUnreadCount}
      />
    </div>
  );
}
