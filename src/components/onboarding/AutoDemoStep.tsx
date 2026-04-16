"use client";

import { useState, useEffect, useRef } from "react";
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
  | "extract-details"
  | "choose-selecting"
  | "assign-filling"
  | "calendar-daily"
  | "grocery-list";

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

// Mock ingredients and steps for the demo recipe (Mapo Tofu)
const DEMO_INGREDIENTS = [
  "1 block firm tofu, cubed",
  "200g ground pork",
  "2 tbsp doubanjiang (chili bean paste)",
  "1 tbsp fermented black beans",
  "4 cloves garlic, minced",
  "1 tbsp Sichuan peppercorns",
  "2 green onions, sliced",
];

const DEMO_STEPS = [
  "Blanch tofu cubes in salted boiling water for 2 minutes",
  "Stir-fry ground pork until browned and crispy",
  "Add doubanjiang, black beans, and garlic — cook until fragrant",
  "Add tofu and broth, simmer 5 minutes",
  "Finish with Sichuan peppercorn oil and green onions",
];

// Mock grocery list items
const GROCERY_ITEMS = [
  { aisle: "Produce", items: ["Green onions", "Garlic (1 head)", "Ginger root"] },
  { aisle: "Protein", items: ["Firm tofu (1 block)", "Ground pork (200g)"] },
  { aisle: "Asian Aisle", items: ["Doubanjiang paste", "Fermented black beans", "Sichuan peppercorns"] },
  { aisle: "Pantry", items: ["Soy sauce", "Sesame oil", "Cornstarch"] },
];

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

// Phase header config
const PHASE_HEADERS: Record<Phase, { title: string; subtitle: string }> = {
  "extract-typing": { title: "Save recipes from any website", subtitle: "Paste a link and Marco does the rest" },
  "extract-loading": { title: "Save recipes from any website", subtitle: "Extracting recipe details..." },
  "extract-reveal": { title: "Save recipes from any website", subtitle: "Recipe saved!" },
  "extract-details": { title: "Save recipes from any website", subtitle: "Ingredients and steps ready to go" },
  "choose-selecting": { title: "Build your meal plan", subtitle: "Pick recipes for your week" },
  "assign-filling": { title: "Build your meal plan", subtitle: "Assigning meals to your calendar..." },
  "calendar-daily": { title: "Build your meal plan", subtitle: "Your week at a glance" },
  "grocery-list": { title: "Generate your grocery list", subtitle: "Organized by aisle, ready to shop" },
};

export default function AutoDemoStep({ onNext }: Props) {
  const [phase, setPhase] = useState<Phase>("extract-typing");
  const [typed, setTyped] = useState("");
  const [imgError, setImgError] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibleDays, setVisibleDays] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [visibleIngredients, setVisibleIngredients] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [visibleGroceryAisles, setVisibleGroceryAisles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const demoRecipe = DEMO_RECIPES[0];
  const demoUrl = "https://instagram.com/p/spicy-mapo-tofu-recipe";

  const header = PHASE_HEADERS[phase];

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
          setTimeout(() => setPhase("extract-loading"), 500);
        }
      }, 35);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [phase, demoUrl]);

  useEffect(() => {
    if (phase === "extract-loading") {
      const t = setTimeout(() => setPhase("extract-reveal"), 1500);
      return () => clearTimeout(t);
    }
    if (phase === "extract-reveal") {
      const t = setTimeout(() => setPhase("extract-details"), 2000);
      return () => clearTimeout(t);
    }
    if (phase === "extract-details") {
      // Reveal ingredients one by one, then steps
      let ingIdx = 0;
      const ingTimer = setInterval(() => {
        ingIdx++;
        setVisibleIngredients(ingIdx);
        if (ingIdx >= DEMO_INGREDIENTS.length) {
          clearInterval(ingTimer);
          // Then reveal steps
          let stepIdx = 0;
          const stepTimer = setInterval(() => {
            stepIdx++;
            setVisibleSteps(stepIdx);
            if (stepIdx >= DEMO_STEPS.length) {
              clearInterval(stepTimer);
              setTimeout(() => setPhase("choose-selecting"), 1500);
            }
          }, 350);
        }
      }, 400);
      return () => clearInterval(ingTimer);
    }
    if (phase === "choose-selecting") {
      let count = 0;
      const t = setInterval(() => {
        count++;
        setSelectedCount(count);
        if (count >= 4) { clearInterval(t); setTimeout(() => setPhase("assign-filling"), 1000); }
      }, 650);
      return () => clearInterval(t);
    }
    if (phase === "assign-filling") {
      const t = setTimeout(() => setPhase("calendar-daily"), 2000);
      return () => clearTimeout(t);
    }
    if (phase === "calendar-daily") {
      let day = 0;
      const t = setInterval(() => {
        day++;
        setVisibleDays(day);
        setSelectedDayIdx(day - 1);
        if (day >= WEEK_MEALS.length) {
          clearInterval(t);
          setTimeout(() => setPhase("grocery-list"), 1500);
        }
      }, 900);
      return () => clearInterval(t);
    }
    if (phase === "grocery-list") {
      let aisleIdx = 0;
      const t = setInterval(() => {
        aisleIdx++;
        setVisibleGroceryAisles(aisleIdx);
        if (aisleIdx >= GROCERY_ITEMS.length) clearInterval(t);
      }, 700);
      return () => clearInterval(t);
    }
  }, [phase]);

  // Auto-scroll to latest visible day
  useEffect(() => {
    if (phase === "calendar-daily" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleDays, phase]);

  // Auto-scroll for extract-details
  useEffect(() => {
    if (phase === "extract-details" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleIngredients, visibleSteps, phase]);

  // Auto-scroll for grocery list
  useEffect(() => {
    if (phase === "grocery-list" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleGroceryAisles, phase]);

  // ─── Phase header component ───
  const PhaseHeader = () => (
    <div className="pt-4 pb-3 px-6 text-center">
      <h1 className="text-[22px] font-black tracking-tight leading-tight" style={{ color: TEXT_1 }}>
        {header.title}
      </h1>
      <p className="text-xs mt-1.5 font-medium" style={{ color: "#a09890" }}>{header.subtitle}</p>
    </div>
  );

  // ─── Extract phases ───
  if (phase === "extract-typing" || phase === "extract-loading" || phase === "extract-reveal") {
    return (
      <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
        <PhaseHeader />
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
                    <span className="text-6xl">{"\u{1F336}\uFE0F"}</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-base font-bold" style={{ color: TEXT_1 }}>{demoRecipe.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block" style={{ background: "#22c55e", color: "white" }}>Extracted!</span>
                    <span className="text-[10px] font-medium" style={{ color: "#a09890" }}>{demoRecipe.prep_time_minutes} min prep</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Extract details (ingredients + steps) ───
  if (phase === "extract-details") {
    return (
      <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
        <PhaseHeader />
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Recipe card header */}
            <div className="rounded-2xl overflow-hidden mb-3" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
              <div className="h-32 relative flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}>
                {demoRecipe.image_url && !imgError ? (
                  <Image src={demoRecipe.image_url} alt={demoRecipe.title} fill className="object-cover" onError={() => setImgError(true)} />
                ) : (
                  <span className="text-5xl">{"\u{1F336}\uFE0F"}</span>
                )}
              </div>
              <div className="px-4 py-3">
                <h3 className="text-base font-bold" style={{ color: TEXT_1 }}>{demoRecipe.title}</h3>
                <div className="flex gap-2 mt-1">
                  {demoRecipe.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#f3f2f0", color: "#888" }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Ingredients */}
            {visibleIngredients > 0 && (
              <div className="rounded-2xl p-4 mb-3" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#a09890" }}>
                  Ingredients
                </p>
                <div className="space-y-1.5">
                  {DEMO_INGREDIENTS.slice(0, visibleIngredients).map((ing, i) => (
                    <div key={i} className="flex items-center gap-2 animate-stagger-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
                      <span className="text-[13px]" style={{ color: TEXT_1 }}>{ing}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps */}
            {visibleSteps > 0 && (
              <div className="rounded-2xl p-4 mb-3" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#a09890" }}>
                  Steps
                </p>
                <div className="space-y-2.5">
                  {DEMO_STEPS.slice(0, visibleSteps).map((step, i) => (
                    <div key={i} className="flex gap-2.5 animate-stagger-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                        style={{ background: ACCENT, color: "white" }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-[13px] leading-snug" style={{ color: TEXT_1 }}>{step}</span>
                    </div>
                  ))}
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
        <PhaseHeader />
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
        <PhaseHeader />
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

  // ─── Grocery list ───
  if (phase === "grocery-list") {
    return (
      <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
        <PhaseHeader />
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3">
          {GROCERY_ITEMS.slice(0, visibleGroceryAisles).map((aisle, ai) => (
            <div key={aisle.aisle} className="animate-stagger-in rounded-2xl p-4" style={{ animationDelay: `${ai * 0.1}s`, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: ACCENT }}>
                {aisle.aisle}
              </p>
              <div className="space-y-1.5">
                {aisle.items.map((item, ii) => (
                  <div key={ii} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: "#d4d0cc" }} />
                    <span className="text-[13px]" style={{ color: TEXT_1 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {visibleGroceryAisles >= GROCERY_ITEMS.length && <div className="h-4" />}
        </div>

        {/* CTA after all grocery aisles revealed */}
        {visibleGroceryAisles >= GROCERY_ITEMS.length && (
          <div className="px-6 pt-3 animate-stagger-in" style={{ animationDelay: "0.3s" }}>
            <button onClick={onNext} className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]" style={{ background: ACCENT }}>
              Now build your taste profile
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Calendar daily view (matching MealPlanListView) ───
  const DAYS_ABBREV = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const dayNums = [30, 31, 1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col h-full pb-8" style={{ background: BG }}>
      <PhaseHeader />
      {/* Day strip */}
      <div className="px-4 pb-2" style={{ background: BG }}>
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
    </div>
  );
}
