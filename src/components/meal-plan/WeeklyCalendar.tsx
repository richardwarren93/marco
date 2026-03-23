"use client";

import { useState } from "react";
import type { MealPlan, Recipe } from "@/types";
import DayColumn from "./CalendarCell";
import AddMealModal from "./AddMealModal";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function WeeklyCalendar({
  mealPlans,
  householdPlans = [],
  onAddMeal,
  onRemoveMeal,
  recipePool,
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onAddMeal: (recipeId: string, dates: string[], mealType: string, servings?: number) => void;
  onRemoveMeal: (planId: string) => void;
  recipePool?: Recipe[];
}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalMealType, setModalMealType] = useState("dinner");

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = formatDateKey(new Date());

  // Build lookup: date -> MealPlan[]
  const plansByDate: Record<string, MealPlan[]> = {};
  const allPlans = [...mealPlans, ...householdPlans];
  for (const plan of allPlans) {
    if (!plansByDate[plan.planned_date]) plansByDate[plan.planned_date] = [];
    plansByDate[plan.planned_date].push(plan);
  }

  function openAddModal(date: string, mealType = "dinner") {
    setModalDate(date);
    setModalMealType(mealType);
    setModalOpen(true);
  }

  const weekEnd = addDays(weekStart, 6);
  const monthLabel = (() => {
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

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors touch-manipulation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="text-[10px] text-orange-600 hover:text-orange-700 font-medium px-2 py-0.5 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors touch-manipulation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 7-column stacked day grid */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <div className="grid grid-cols-7 gap-1 min-w-[420px]">
          {weekDays.map((day) => {
            const dateKey = formatDateKey(day);
            const isToday = dateKey === today;
            const plans = plansByDate[dateKey] || [];

            return (
              <div key={dateKey} className="flex flex-col">
                {/* Day header */}
                <div className={`text-center py-1.5 rounded-xl mb-1 ${isToday ? "bg-orange-100" : ""}`}>
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? "text-orange-500" : "text-gray-400"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={`text-sm font-bold leading-tight ${isToday ? "text-orange-600" : "text-gray-700"}`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Stacked meals for this day */}
                <DayColumn
                  plans={plans}
                  isToday={isToday}
                  onAdd={(mealType) => openAddModal(dateKey, mealType)}
                  onRemove={onRemoveMeal}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Meal Modal */}
      <AddMealModal
        isOpen={modalOpen}
        date={modalDate}
        mealType={modalMealType}
        onClose={() => setModalOpen(false)}
        onAdd={(recipeId, dates, mealType, servings) => {
          onAddMeal(recipeId, dates, mealType, servings);
        }}
        recipePool={recipePool && recipePool.length > 0 ? recipePool : undefined}
      />
    </div>
  );
}
