"use client";

import { useState, useEffect, useCallback } from "react";
import { getMealPlanDemoRecipes, type SampleRecipe } from "./data/sample-recipes";

interface Props {
  assignments: Record<string, string[]>;
  onNext: (assignments: Record<string, string[]>) => void;
  onBack: () => void;
}

const RECIPES = getMealPlanDemoRecipes();
const AUTO_PICKS = [RECIPES[0], RECIPES[1], RECIPES[2], RECIPES[3]];
const AUTO_PICK_IDS = new Set(AUTO_PICKS.map((r) => r.id));

const MEAL_TABS = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: "\u{1F95E}",
  lunch: "\u{1F957}",
  dinner: "\u{1F35D}",
  snack: "\u{1F370}",
};

const DAYS_OF_WEEK = [
  { id: "Mon", label: "M" },
  { id: "Tue", label: "T" },
  { id: "Wed", label: "W" },
  { id: "Thu", label: "T" },
  { id: "Fri", label: "F" },
  { id: "Sat", label: "S" },
  { id: "Sun", label: "S" },
];

type SubStep = "choose" | "review" | "assign";

export default function MealPlanDemoStep({ onNext, onBack }: Props) {
  const [subStep, setSubStep] = useState<SubStep>("choose");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoSelectIdx, setAutoSelectIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("All");

  // Auto-select recipes one by one with animation (choose step only)
  useEffect(() => {
    if (subStep !== "choose") return;
    if (autoSelectIdx >= AUTO_PICKS.length) return;
    const t = setTimeout(() => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(AUTO_PICKS[autoSelectIdx].id);
        return next;
      });
      setAutoSelectIdx((i) => i + 1);
    }, 600);
    return () => clearTimeout(t);
  }, [subStep, autoSelectIdx]);

  const autoAssignments: Record<string, { days: string[]; mealType: string }> = {
    [AUTO_PICKS[0].id]: { days: ["Mon", "Wed", "Fri"], mealType: "breakfast" },
    [AUTO_PICKS[1].id]: { days: ["Mon", "Thu"], mealType: "lunch" },
    [AUTO_PICKS[2].id]: { days: ["Tue", "Fri"], mealType: "dinner" },
    [AUTO_PICKS[3].id]: { days: ["Wed", "Sat"], mealType: "dinner" },
  };

  const buildFinalAssignments = useCallback(() => {
    const result: Record<string, string[]> = {};
    for (const [recipeId, assignment] of Object.entries(autoAssignments)) {
      for (const day of assignment.days) {
        if (!result[day]) result[day] = [];
        result[day].push(recipeId);
      }
    }
    return result;
  }, []);

  const totalSlots = Object.values(autoAssignments).reduce((s, a) => s + a.days.length, 0);
  const doneAutoSelecting = autoSelectIdx >= AUTO_PICKS.length;

  // ─── Choose ───
  if (subStep === "choose") {
    return (
      <div className="flex flex-col h-full pb-8" style={{ background: "#faf9f7" }}>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #ede8e0" }}>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-lg font-bold" style={{ color: "#1a1410" }}>Choose meals</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {MEAL_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  background: activeTab === tab ? "#1a1410" : "white",
                  color: activeTab === tab ? "white" : "#1a1410",
                  boxShadow: activeTab === tab ? "none" : "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {!doneAutoSelecting && (
          <div className="text-center py-3 animate-pulse-soft">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#fff4ec", color: "#ea580c" }}>
              Picking meals for your week...
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {RECIPES.map((recipe, i) => {
              const isSelected = selectedIds.has(recipe.id);
              const isPending = AUTO_PICK_IDS.has(recipe.id) && !isSelected;
              return (
                <div
                  key={recipe.id}
                  className="animate-stagger-in rounded-2xl overflow-hidden relative"
                  style={{ animationDelay: `${i * 0.04}s`, boxShadow: "0 2px 16px rgba(0,0,0,0.07)", background: "white" }}
                >
                  <div className="h-24 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}>
                    <span className="text-4xl">{recipe.image_emoji}</span>
                    <div
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isSelected ? "#ea580c" : "white",
                        boxShadow: isSelected ? "none" : "0 1px 4px rgba(0,0,0,0.12)",
                        transform: isSelected ? "scale(1.1)" : "scale(1)",
                      }}
                    >
                      {isSelected ? (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={isPending ? "#ea580c" : "#888"} strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[12px] font-semibold leading-tight line-clamp-2" style={{ color: "#1a1410" }}>{recipe.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#a09890" }}>{recipe.prep_time + recipe.cook_time} min</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {doneAutoSelecting && (
          <div className="px-4 pt-3 animate-bounce-in">
            <button
              onClick={() => setSubStep("review")}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
              style={{ background: "#1a1410", boxShadow: "0 4px 20px rgba(26,20,16,0.25)" }}
            >
              View meals &middot; {selectedIds.size}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Review ───
  if (subStep === "review") {
    const grouped: Record<string, SampleRecipe[]> = {};
    for (const r of AUTO_PICKS) {
      if (!grouped[r.meal_type]) grouped[r.meal_type] = [];
      grouped[r.meal_type].push(r);
    }

    return (
      <div className="flex flex-col h-full pb-8" style={{ background: "#faf9f7" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #ede8e0" }}>
          <button onClick={() => setSubStep("choose")} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold" style={{ color: "#1a1410" }}>Review your meals</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-4">
          {Object.entries(grouped).map(([type, recipes]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{MEAL_TYPE_EMOJI[type]}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#a09890" }}>
                  {type} ({recipes.length})
                </span>
              </div>
              <div className="space-y-2">
                {recipes.map((recipe, i) => (
                  <div
                    key={recipe.id}
                    className="animate-stagger-in flex items-center gap-3 p-3 rounded-2xl"
                    style={{ animationDelay: `${i * 0.06}s`, background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}>
                      <span className="text-2xl">{recipe.image_emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#1a1410" }}>{recipe.title}</p>
                      <p className="text-xs" style={{ color: "#a09890" }}>{recipe.prep_time + recipe.cook_time} min</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pt-3">
          <button
            onClick={() => setSubStep("assign")}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
            style={{ background: "#1a1410" }}
          >
            Build schedule
          </button>
        </div>
      </div>
    );
  }

  // ─── Assign ───
  return (
    <div className="flex flex-col h-full pb-8" style={{ background: "#f6f6f4" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => setSubStep("review")} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#1a1410" }}>Place on calendar</h1>
          <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>Choose days and meal types for each recipe</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {AUTO_PICKS.map((recipe, ri) => {
          const assignment = autoAssignments[recipe.id];
          return (
            <div
              key={recipe.id}
              className="animate-stagger-in rounded-2xl p-4"
              style={{ animationDelay: `${ri * 0.1}s`, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}>
                  <span className="text-lg">{recipe.image_emoji}</span>
                </div>
                <p className="text-sm font-semibold flex-1 truncate" style={{ color: "#1a1410" }}>{recipe.title}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#fff4ec", color: "#ea580c" }}>
                  {assignment.days.length}&times;
                </span>
              </div>

              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a09890" }}>Days</p>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isActive = assignment.days.includes(day.id);
                    return (
                      <div key={day.id} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: isActive ? "#1a1a1a" : "#f3f3f1", color: isActive ? "white" : "#888" }}>
                        {day.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a09890" }}>Meal type</p>
                <div className="flex gap-2">
                  {["breakfast", "lunch", "dinner"].map((mt) => (
                    <div key={mt} className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize" style={{ background: assignment.mealType === mt ? "#ea580c" : "#f3f3f1", color: assignment.mealType === mt ? "white" : "#888" }}>
                      {mt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 pt-3">
        <button
          onClick={() => onNext(buildFinalAssignments())}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
          style={{ background: "#1a1410" }}
        >
          Schedule {totalSlots} meals
        </button>
      </div>
    </div>
  );
}
