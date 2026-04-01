"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import type { Recipe } from "@/types";
import RANKING_RECIPES from "./data/ranking-recipes";

interface Props {
  onNext: () => void;
}

type Phase =
  | "extract-typing"
  | "extract-loading"
  | "extract-reveal"
  | "choose-selecting"
  | "assign-filling"
  | "calendar-daily";

// Colors matching MealPlanListView
const ACCENT = "#e8530a";
const BG = "#f4f3f1";
const TEXT_1 = "#141414";

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "\u{1F95E}", lunch: "\u{1F957}", dinner: "\u{1F35D}", snack: "\u{1F34E}",
};

// Convert ranking recipes to Recipe-like objects
const DEMO_RECIPES: Recipe[] = RANKING_RECIPES.map((r) => ({
  id: r.id, user_id: "", title: r.title, source_url: null, source_platform: null,
  description: null, ingredients: [], steps: [], servings: null,
  prep_time_minutes: r.prepTime, cook_time_minutes: 0, tags: r.tags,
  meal_type: "dinner" as const, image_url: r.image, notes: null, created_at: "", updated_at: "",
}));

// Mock daily schedule
const WEEK_MEALS: { day: string; dayNum: number; meals: { recipe: Recipe; mealType: string }[] }[] = [
  { day: "Monday", dayNum: 30, meals: [
    { recipe: DEMO_RECIPES[0], mealType: "dinner" },
  ]},
  { day: "Tuesday", dayNum: 31, meals: [
    { recipe: DEMO_RECIPES[1], mealType: "lunch" },
    { recipe: DEMO_RECIPES[2], mealType: "dinner" },
  ]},
  { day: "Wednesday", dayNum: 1, meals: [
    { recipe: DEMO_RECIPES[3], mealType: "dinner" },
  ]},
  { day: "Thursday", dayNum: 2, meals: [
    { recipe: DEMO_RECIPES[0], mealType: "lunch" },
    { recipe: DEMO_RECIPES[4], mealType: "dinner" },
  ]},
  { day: "Friday", dayNum: 3, meals: [
    { recipe: DEMO_RECIPES[5], mealType: "dinner" },
  ]},
];

export default function AutoDemoStep({ onNext }: Props) {
  const [phase, setPhase] = useState<Phase>("extract-typing");
  const [typed, setTyped] = useState("");
  const [imgError, setImgError] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibleDays, setVisibleDays] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const demoRecipe = DEMO_RECIPES[0];
  const demoUrl = "https://instagram.com/p/spicy-mapo-tofu-recipe";

  // Phase transitions
  useEffect(() => {
    if (phase === "extract-typing") {
      let idx = 0;
      const url = demoUrl.length > 40 ? demoUrl.slice(0, 40) + "..." : demoUrl;
      intervalRef.current = setInterval(() => {
        idx++;
        setTyped(url.slice(0, idx));
        if (idx >= url.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => setPhase("extract-loading"), 300);
        }
      }, 25);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [phase, demoUrl]);

  useEffect(() => {
    if (phase === "extract-loading") {
      const t = setTimeout(() => setPhase("extract-reveal"), 1200);
      return () => clearTimeout(t);
    }
    if (phase === "extract-reveal") {
      const t = setTimeout(() => setPhase("choose-selecting"), 1800);
      return () => clearTimeout(t);
    }
    if (phase === "choose-selecting") {
      let count = 0;
      const t = setInterval(() => {
        count++;
        setSelectedCount(count);
        if (count >= 4) { clearInterval(t); setTimeout(() => setPhase("assign-filling"), 600); }
      }, 400);
      return () => clearInterval(t);
    }
    if (phase === "assign-filling") {
      const t = setTimeout(() => setPhase("calendar-daily"), 1500);
      return () => clearTimeout(t);
    }
    if (phase === "calendar-daily") {
      // Reveal days one by one, then auto-scroll through them
      let day = 0;
      const t = setInterval(() => {
        day++;
        setVisibleDays(day);
        setSelectedDayIdx(day - 1);
        if (day >= WEEK_MEALS.length) clearInterval(t);
      }, 600);
      return () => clearInterval(t);
    }
  }, [phase]);

  // Auto-scroll to latest visible day
  useEffect(() => {
    if (phase === "calendar-daily" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleDays, phase]);

  // ─── Extract phases ───
  if (phase === "extract-typing" || phase === "extract-loading" || phase === "extract-reveal") {
    return (
      <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
        <div className="pt-4 pb-3 px-6 text-center">
          <h1 className="text-[24px] font-black tracking-tight" style={{ color: TEXT_1 }}>
            See the <span style={{ color: ACCENT }}>magic</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: "#a09890" }}>Watch how Marco works</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="animate-stagger-in rounded-2xl px-4 py-3 mb-3" style={{ background: "white", border: "2px solid #e8ddd3" }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#a09890" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div className="font-mono text-xs min-h-[20px] flex-1 break-all" style={{ color: TEXT_1 }}>
                  {typed}{phase === "extract-typing" && <span className="animate-cursor">&nbsp;</span>}
                </div>
              </div>
            </div>
            {phase === "extract-loading" && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div className="skeleton-warm h-40 w-full" />
                <div className="p-3 space-y-2">
                  <div className="skeleton-warm h-5 w-3/4 rounded-lg" />
                  <div className="skeleton-warm h-3 w-full rounded-lg" />
                </div>
              </div>
            )}
            {phase === "extract-reveal" && (
              <div className="animate-card-pop rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
                <div className="h-40 relative flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}>
                  {demoRecipe.image_url && !imgError ? (
                    <Image src={demoRecipe.image_url} alt={demoRecipe.title} fill className="object-cover" onError={() => setImgError(true)} />
                  ) : (
                    <span className="text-6xl">{"\u{1F35D}"}</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-base font-bold" style={{ color: TEXT_1 }}>{demoRecipe.title}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: "#22c55e", color: "white" }}>Extracted!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Choose meals (multi-select grid) ───
  if (phase === "choose-selecting") {
    return (
      <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
        <div className="pt-4 pb-3 px-6 text-center">
          <h1 className="text-[24px] font-black tracking-tight" style={{ color: TEXT_1 }}>
            Building your <span style={{ color: ACCENT }}>meal plan</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: "#a09890" }}>Selecting recipes for your week...</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-3">
            {DEMO_RECIPES.slice(0, 6).map((recipe, i) => {
              const isSelected = i < selectedCount;
              const isPicking = i === selectedCount;
              return (
                <div key={recipe.id} className="rounded-2xl overflow-hidden relative transition-all duration-300"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)", background: "white", transform: isPicking ? "scale(1.03)" : "scale(1)" }}>
                  <div className="h-24 relative flex items-center justify-center" style={{ background: "#eeecea" }}>
                    {recipe.image_url ? (
                      <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" />
                    ) : <span className="text-3xl">{"\u{1F35D}"}</span>}
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 z-10"
                      style={{ background: isSelected ? ACCENT : "white", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                      {isSelected ? (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={isPicking ? ACCENT : "#ccc"} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: TEXT_1 }}>{recipe.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {selectedCount > 0 && (
          <div className="px-4 pt-3 animate-bounce-in">
            <div className="w-full py-3 rounded-2xl font-bold text-sm text-white text-center" style={{ background: TEXT_1 }}>
              View meals &middot; {selectedCount}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Assign days ───
  if (phase === "assign-filling") {
    return (
      <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
        <div className="pt-4 pb-3 px-6">
          <h1 className="text-lg font-bold" style={{ color: TEXT_1 }}>Place on calendar</h1>
          <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>Assigning meals to your week...</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {DEMO_RECIPES.slice(0, 4).map((recipe, i) => (
            <div key={recipe.id} className="animate-stagger-in rounded-2xl p-3 flex items-center gap-3"
              style={{ animationDelay: `${i * 0.12}s`, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
              <div className="w-10 h-10 rounded-xl overflow-hidden relative flex-shrink-0" style={{ background: "#eeecea" }}>
                {recipe.image_url ? <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" /> : <span className="text-lg flex items-center justify-center w-full h-full">{"\u{1F35D}"}</span>}
              </div>
              <p className="text-xs font-semibold flex-1 truncate" style={{ color: TEXT_1 }}>{recipe.title}</p>
              <span className="animate-pulse-soft text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fff4ec", color: ACCENT }}>scheduling...</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Calendar daily view (matching MealPlanListView) ───
  const DAYS_ABBREV = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const dayNums = [30, 31, 1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
      {/* Sticky header matching MealPlanListView */}
      <div className="sticky top-0 z-10 pt-3 pb-2 px-4" style={{ background: BG }}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-2xl font-black tracking-tight" style={{ color: TEXT_1 }}>This Week</h2>
          <span className="text-lg">{"\u{2728}"}</span>
        </div>

        {/* Day strip - matching the real app */}
        <div className="flex justify-between">
          {DAYS_ABBREV.map((abbr, i) => {
            const isSelected = i === selectedDayIdx;
            const hasMeals = i < WEEK_MEALS.length && WEEK_MEALS[i].meals.length > 0;
            return (
              <div key={abbr} className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-semibold tracking-wide" style={{ color: isSelected ? ACCENT : "#888" }}>{abbr}</span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-150"
                  style={{
                    background: isSelected ? ACCENT : "transparent",
                    color: isSelected ? "white" : hasMeals ? TEXT_1 : "#ccc",
                  }}
                >
                  {dayNums[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily meal cards - auto-revealing */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-4">
        {WEEK_MEALS.slice(0, visibleDays).map((day, di) => (
          <div key={day.day} className="animate-stagger-in" style={{ animationDelay: `${di * 0.1}s` }}>
            {/* Day label */}
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#b8b8b6" }}>
              {day.day}
            </p>

            {/* Meal card container */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
              {day.meals.map((meal, mi) => (
                <div key={mi} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: mi > 0 ? "1px solid #f0efed" : undefined }}>
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden relative flex-shrink-0" style={{ background: "#eeecea" }}>
                    {meal.recipe.image_url ? (
                      <Image src={meal.recipe.image_url} alt={meal.recipe.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl opacity-50">{MEAL_EMOJI[meal.mealType]}</div>
                    )}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold line-clamp-2 leading-snug" style={{ color: TEXT_1 }}>{meal.recipe.title}</p>
                    <p className="text-[11px] mt-0.5 capitalize font-medium" style={{ color: "#b8b8b6" }}>
                      {meal.mealType} &middot; {meal.recipe.prep_time_minutes || 30} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {visibleDays >= WEEK_MEALS.length && <div className="h-4" />}
      </div>

      {/* CTA after all days revealed */}
      {visibleDays >= WEEK_MEALS.length && (
        <div className="px-6 pt-3 animate-stagger-in" style={{ animationDelay: "0.3s" }}>
          <button onClick={onNext} className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]" style={{ background: ACCENT }}>
            Now build your taste profile
          </button>
        </div>
      )}
    </div>
  );
}
