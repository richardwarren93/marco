"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { MealPlan, Recipe } from "@/types";
import AddMealSheet from "./AddMealSheet";
import RecipePreviewSheet from "./RecipePreviewSheet";
import EditMealSheet from "./EditMealSheet";

// ─── Theme ────────────────────────────────────────────────────────────────────
const ACCENT = "#3f7058";
const ACCENT_LIGHT = "#e6f0eb";
const BG = "#f6f6f4";
const SURFACE = "#ffffff";
const TEXT_1 = "#1a1a1a";
const TEXT_2 = "#888888";
const BORDER = "#e8e8e6";

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
      <div
        onClick={() => {
          if (isRevealed) return;
          onTap();
        }}
        style={{
          transform: `translateX(${currentX}px)`,
          transition: isActive ? undefined : "transform 0.3s cubic-bezier(0.25,1,0.5,1)",
          background: SURFACE,
        }}
        className={`group relative w-full flex items-center gap-3 cursor-pointer text-left ${
          compact ? "px-4 py-3" : "px-4 py-3.5"
        } hover:bg-gray-50/70 active:bg-gray-100/70`}
      >
        {/* Thumbnail */}
        <div
          className={`rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center ${
            compact ? "w-9 h-9" : "w-11 h-11"
          }`}
        >
          {plan.recipe?.image_url ? (
            <img src={plan.recipe.image_url} alt={plan.recipe?.title || ""} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm">{MEAL_EMOJI[plan.meal_type] || "🍴"}</span>
          )}
        </div>

        {/* Title + type */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold line-clamp-1" style={{ color: plan.owner_name ? "#6b7280" : TEXT_1 }}>
            {plan.recipe?.title || "Untitled"}
          </p>
          <p className="text-xs mt-0.5 capitalize" style={{ color: TEXT_2 }}>
            {plan.owner_name ? `${plan.meal_type} · ${plan.owner_name}` : plan.meal_type}
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

        {/* Mobile: chevron */}
        {!isActive && !isRevealed && (
          <svg className="sm:hidden w-4 h-4 flex-shrink-0" style={{ color: BORDER }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
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
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onAddMeal: (recipeId: string, dates: string[], mealType: string, servings?: number) => Promise<void>;
  onRemove: (planId: string) => void;
  onEditMeal?: (planId: string, updates: { meal_type?: string; recipe_id?: string; servings?: number }) => Promise<void>;
  recipePool?: Recipe[];
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

  useEffect(() => { setWeekStart(weekStartProp); }, [weekStartProp]);

  function changeWeek(newWeek: Date) {
    setWeekStart(newWeek);
    onWeekChange(newWeek);
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

  // ─── RecipePreviewSheet & EditMealSheet state ─────────────────────────────────
  const [previewPlan, setPreviewPlan] = useState<MealPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);

  // ─── Swipe-to-delete ─────────────────────────────────────────────────────────
  const DELETE_BTN_WIDTH = 80;
  const touchRef = useRef<{ id: string; startX: number; startY: number; locked: boolean; cancelled: boolean } | null>(null);
  const swipedRef = useRef(false);
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

  // ─── Helpers ─────────────────────────────────────────────────────────────────
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
      <div className="space-y-5">
        {/* ── Day strip ──────────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {sortedDates.map((dateKey) => {
            const d = new Date(dateKey + "T12:00:00");
            const abbr = d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0);
            const num = d.getDate();
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === today;
            const hasMeals = (byDate[dateKey]?.length || 0) > 0;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className="flex flex-col items-center flex-shrink-0 w-10 py-2 rounded-2xl transition-all active:scale-95 touch-manipulation relative"
                style={
                  isSelected
                    ? { background: ACCENT, color: "white" }
                    : { background: "transparent", color: isToday ? ACCENT : TEXT_2 }
                }
              >
                <span className="text-[10px] font-medium">{abbr}</span>
                <span className="text-sm font-bold mt-0.5" style={isToday && !isSelected ? { textDecoration: "underline", textDecorationColor: ACCENT } : {}}>
                  {num}
                </span>
                {/* Meal dot */}
                {hasMeals && !isSelected && (
                  <span className="w-1 h-1 rounded-full mt-1" style={{ background: isToday ? ACCENT : "#ccc" }} />
                )}
                {hasMeals && isSelected && <span className="w-1 h-1 rounded-full mt-1 bg-white/60" />}
                {!hasMeals && <span className="w-1 h-1 mt-1" />}
              </button>
            );
          })}
        </div>

        {/* ── Selected day hero ───────────────────────────────────────────── */}
        <div style={{ animation: "dayHeroIn 0.25s ease both" }}>
          {/* Day label */}
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: TEXT_2 }}>
            {selectedDate === today ? "Today" : selectedDayLabel}
          </p>

          {/* Meal cards */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            {selectedPlans.length === 0 ? (
              <div className="flex flex-col items-center py-10 px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#f3f3f1" }}>
                  <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: TEXT_2 }}>Nothing planned</p>
                <p className="text-xs mt-1" style={{ color: "#bbb" }}>Add a meal below</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#f0f0ee" }}>
                {selectedPlans.map((plan) => renderMealRow(plan))}
              </div>
            )}

            {/* Add meal CTA */}
            <div className="px-4 py-3" style={{ borderTop: `1px solid #f0f0ee` }}>
              <button
                onClick={() => openAddSheet(selectedDate)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] touch-manipulation"
                style={{ background: ACCENT_LIGHT, color: ACCENT }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add meal
              </button>
            </div>
          </div>
        </div>

        {/* ── Rest of week ────────────────────────────────────────────────── */}
        {otherDates.some((d) => byDate[d]?.length > 0) && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: TEXT_2 }}>
              Rest of week
            </p>
            <div className="space-y-2">
              {otherDates.map((dateKey) => {
                const plans = byDate[dateKey] || [];
                if (plans.length === 0) return null;
                const d = new Date(dateKey + "T12:00:00");
                const dayName = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                const isToday = dateKey === today;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors active:scale-[0.99] touch-manipulation"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isToday ? ACCENT_LIGHT : "#f3f3f1" }}>
                      <span className="text-xs font-bold" style={{ color: isToday ? ACCENT : TEXT_2 }}>
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: TEXT_1 }}>{dayName}</p>
                      <p className="text-xs mt-0.5" style={{ color: TEXT_2 }}>
                        {plans.slice(0, 2).map((p) => p.recipe?.title || p.meal_type).join(" · ")}
                        {plans.length > 2 ? ` +${plans.length - 2} more` : ""}
                      </p>
                    </div>
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#ccc" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
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
      <div className="space-y-3">
        {/* Week nav */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => changeWeek(addDays(weekStart, -7))}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            style={{ color: TEXT_2 }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: TEXT_1 }}>{weekLabel}</span>
            <button
              onClick={() => { changeWeek(getMonday(new Date())); setSelectedDate(today); }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors"
              style={{ background: ACCENT_LIGHT, color: ACCENT }}
            >
              Today
            </button>
          </div>
          <button
            onClick={() => changeWeek(addDays(weekStart, 7))}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            style={{ color: TEXT_2 }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

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
                border: `1px solid ${isToday ? "#c5dbd0" : BORDER}`,
                boxShadow: isToday ? `0 0 0 1px ${ACCENT_LIGHT}` : undefined,
              }}
            >
              {/* Day header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: `1px solid #f0f0ee`, background: isToday ? "#f5faf7" : SURFACE }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: TEXT_1 }}>{weekday} {dayNum}</span>
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
                <p className="text-xs text-center py-3 italic" style={{ color: "#ccc" }}>Nothing planned</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "#f0f0ee" }}>
                  {plans.map((plan) => renderMealRow(plan, true))}
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
      {/* ── View mode toggle ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {viewMode === "weekly" && (
            <p className="text-sm font-semibold" style={{ color: TEXT_1 }}>{weekLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#f0f0ee" }}>
          <button
            onClick={() => setViewMode("daily")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={
              viewMode === "daily"
                ? { background: "white", color: ACCENT, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : { background: "transparent", color: TEXT_2 }
            }
          >
            Today
          </button>
          <button
            onClick={() => setViewMode("weekly")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            style={
              viewMode === "weekly"
                ? { background: "white", color: ACCENT, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : { background: "transparent", color: TEXT_2 }
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Week
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {viewMode === "daily" ? renderDailyView() : renderWeeklyView()}

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
