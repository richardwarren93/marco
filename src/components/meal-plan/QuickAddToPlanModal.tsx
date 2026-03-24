"use client";

import { useState } from "react";
import type { Recipe } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

function getWeekDays(): { label: string; dayAbbr: string; date: string; isToday: boolean }[] {
  const today = new Date();
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
      dayAbbr: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: `${yyyy}-${mm}-${dd}`,
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

export default function QuickAddToPlanModal({
  recipe,
  isOpen,
  onClose,
}: {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}) {
  const weekDays = getWeekDays();
  const todayDate = weekDays.find((d) => d.isToday)?.date || weekDays[0].date;

  const [mealType, setMealType] = useState<string>("dinner");
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [servings, setServings] = useState(recipe.servings || 1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  if (!isOpen) return null;

  async function handleAdd() {
    setAdding(true);
    try {
      const res = await fetch("/api/meal-plan/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          slots: [{ date: selectedDate, mealType }],
          replace: false,
        }),
      });

      if (!res.ok) throw new Error("Failed to add");

      setAdded(true);
      setTimeout(() => {
        onClose();
        setAdded(false);
      }, 1200);
    } catch (error) {
      console.error("Add to plan error:", error);
    } finally {
      setAdding(false);
    }
  }

  const selectedDay = weekDays.find((d) => d.date === selectedDate);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Meal type */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
            Meal Type
          </p>
          <div className="flex gap-2">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                onClick={() => setMealType(mt)}
                className={`flex-1 text-sm py-2 rounded-full font-medium capitalize transition-colors ${
                  mealType === mt
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {mt}
              </button>
            ))}
          </div>
        </div>

        {/* Day picker */}
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
            When
          </p>
          <div className="flex gap-1.5">
            {weekDays.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-colors ${
                  selectedDate === day.date
                    ? "bg-orange-500 text-white"
                    : day.isToday
                    ? "bg-orange-50 text-orange-600"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-[10px]">{day.label}</span>
                <span className="text-sm font-semibold">
                  {new Date(day.date + "T12:00:00").getDate()}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recipe preview */}
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
            Recipe
          </p>
          <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-orange-200 bg-orange-50/50">
            {recipe.image_url && (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <p className="text-sm font-medium text-gray-900 flex-1 line-clamp-2">
              {recipe.title}
            </p>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-orange-500 flex-shrink-0"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Servings */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
              Servings
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-lg font-medium"
              >
                −
              </button>
              <span className="text-sm font-semibold text-gray-900 w-4 text-center">
                {servings}
              </span>
              <button
                onClick={() => setServings(servings + 1)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-lg font-medium"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Add button */}
        <div className="px-5 pb-5">
          <button
            onClick={handleAdd}
            disabled={adding || added}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all ${
              added
                ? "bg-green-500 text-white"
                : "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
            } disabled:opacity-70`}
          >
            {adding ? "Adding..." : added ? "Added to plan!" : "Add to plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
