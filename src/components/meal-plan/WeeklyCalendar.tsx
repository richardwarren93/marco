"use client";

import { useState } from "react";
import type { MealPlan } from "@/types";
import CalendarCell from "./CalendarCell";
import AddMealModal from "./AddMealModal";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

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
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onAddMeal: (recipeId: string, date: string, mealType: string) => void;
  onRemoveMeal: (planId: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalMealType, setModalMealType] = useState("dinner");

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = formatDateKey(new Date());

  // Build a lookup: date -> mealType -> MealPlan[]
  const plansByDateMeal: Record<string, Record<string, MealPlan[]>> = {};
  const allPlans = [...mealPlans, ...householdPlans];
  for (const plan of allPlans) {
    if (!plansByDateMeal[plan.planned_date]) {
      plansByDateMeal[plan.planned_date] = {};
    }
    if (!plansByDateMeal[plan.planned_date][plan.meal_type]) {
      plansByDateMeal[plan.planned_date][plan.meal_type] = [];
    }
    plansByDateMeal[plan.planned_date][plan.meal_type].push(plan);
  }

  function openAddModal(date: string, mealType: string) {
    setModalDate(date);
    setModalMealType(mealType);
    setModalOpen(true);
  }

  const weekEnd = addDays(weekStart, 6);
  const monthLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? weekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${weekStart.toLocaleDateString("en-US", { month: "short" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
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
          className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid — horizontally scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1">
            <div /> {/* spacer for meal type column */}
            {weekDays.map((day) => {
              const dateKey = formatDateKey(day);
              const isToday = dateKey === today;
              return (
                <div
                  key={dateKey}
                  className={`text-center py-1.5 rounded-lg ${
                    isToday ? "bg-orange-100" : ""
                  }`}
                >
                  <p className={`text-[10px] font-medium ${isToday ? "text-orange-700" : "text-gray-400"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-orange-700" : "text-gray-700"}`}>
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1">
              {/* Meal type label */}
              <div className="flex items-center justify-center">
                <span className="text-sm" title={mealType}>
                  {MEAL_LABELS[mealType]}
                </span>
              </div>

              {/* Day cells */}
              {weekDays.map((day) => {
                const dateKey = formatDateKey(day);
                const plans = plansByDateMeal[dateKey]?.[mealType] || [];
                const isToday = dateKey === today;

                return (
                  <div
                    key={`${dateKey}-${mealType}`}
                    className={`min-h-[48px] p-1 rounded-lg border transition-colors ${
                      isToday
                        ? "border-orange-200 bg-orange-50/30"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <CalendarCell
                      plans={plans}
                      onAdd={() => openAddModal(dateKey, mealType)}
                      onRemove={onRemoveMeal}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add Meal Modal */}
      <AddMealModal
        isOpen={modalOpen}
        date={modalDate}
        mealType={modalMealType}
        onClose={() => setModalOpen(false)}
        onAdd={(recipeId, date, mealType) => {
          onAddMeal(recipeId, date, mealType);
        }}
      />
    </div>
  );
}
