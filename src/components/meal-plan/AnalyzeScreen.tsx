"use client";

import type { MealPlan } from "@/types";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

type InsightAction = { date: string; mealType?: string } | null;

type Insight = {
  id: string;
  icon: string;
  message: string;
  sub?: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  action: InsightAction;
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "☕",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

export default function AnalyzeScreen({
  mealPlans,
  onBack,
  onNavigate,
}: {
  mealPlans: MealPlan[];
  onBack: () => void;
  onNavigate: (hint: { date: string; mealType?: string }) => void;
}) {
  const weekStart = getMonday(new Date());
  const weekEnd = addDays(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) => formatDateKey(addDays(weekStart, i)));

  // Only user's own plans for this week
  const weekPlans = mealPlans.filter((p) => weekDates.includes(p.planned_date));

  const byDate: Record<string, MealPlan[]> = {};
  for (const d of weekDates) byDate[d] = [];
  for (const p of weekPlans) byDate[p.planned_date].push(p);

  const insights: Insight[] = [];

  // 1. Days with nothing planned at all
  const emptyDays = weekDates.filter((d) => byDate[d].length === 0);
  if (emptyDays.length > 0) {
    insights.push({
      id: "missing_days",
      icon: "📅",
      message:
        emptyDays.length === 1
          ? `${formatDayLabel(emptyDays[0])} has nothing planned`
          : `${emptyDays.length} days have nothing planned`,
      sub: emptyDays.length > 1 ? `Starting ${formatDayLabel(emptyDays[0])}` : undefined,
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      action: { date: emptyDays[0] },
    });
  }

  // 2. Missing meal types (breakfast, lunch, dinner) — flag if absent on 3+ days
  for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
    const missingDays = weekDates.filter(
      (d) => !weekPlans.some((p) => p.planned_date === d && p.meal_type === mealType)
    );
    if (missingDays.length >= 3) {
      insights.push({
        id: `missing_${mealType}`,
        icon: MEAL_ICONS[mealType],
        message: `No ${mealType} on ${missingDays.length} day${missingDays.length !== 1 ? "s" : ""}`,
        sub: `First: ${formatDayLabel(missingDays[0])}`,
        textColor: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        action: { date: missingDays[0], mealType },
      });
    }
  }

  // 3. Recipe repetition — flag if same recipe appears 3+ times this week
  const recipeCounts: Record<string, { title: string; count: number }> = {};
  for (const p of weekPlans) {
    if (!p.recipe_id) continue;
    const key = p.recipe_id;
    const title = p.recipe?.title || "Unknown recipe";
    if (!recipeCounts[key]) recipeCounts[key] = { title, count: 0 };
    recipeCounts[key].count++;
  }
  for (const { title, count } of Object.values(recipeCounts)) {
    if (count >= 3) {
      insights.push({
        id: `repeat_${title}`,
        icon: "🔁",
        message: `"${title}" planned ${count} times`,
        sub: "Consider mixing it up",
        textColor: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        action: null,
      });
    }
  }

  // 4. Positive: well-balanced week
  const totalMeals = weekPlans.length;
  const coveredMealTypes = new Set(weekPlans.map((p) => p.meal_type)).size;
  if (insights.length === 0) {
    insights.push({
      id: "all_good",
      icon: "✅",
      message: "Your week looks well-balanced!",
      sub: `${totalMeals} meal${totalMeals !== 1 ? "s" : ""} planned across ${coveredMealTypes} meal type${coveredMealTypes !== 1 ? "s" : ""}`,
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      action: null,
    });
  }

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

  const hasActionable = insights.some((i) => i.action !== null);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Analyze your meal plan</h1>
        <p className="text-sm text-gray-400 mt-0.5">{weekLabel}</p>
      </div>

      {/* Insights */}
      <div className="flex-1 px-4 py-5 space-y-3 overflow-y-auto">
        {hasActionable && (
          <p className="text-xs text-gray-400 mb-1">Tap an item to fix</p>
        )}

        {insights.map((insight) => {
          const isClickable = insight.action !== null;
          return (
            <button
              key={insight.id}
              onClick={() => isClickable && onNavigate(insight.action!)}
              disabled={!isClickable}
              className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition-all ${insight.bgColor} ${insight.borderColor} ${
                isClickable
                  ? "hover:brightness-95 active:scale-[0.98] cursor-pointer"
                  : "cursor-default"
              }`}
            >
              <span className="text-xl leading-none mt-0.5">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${insight.textColor}`}>{insight.message}</p>
                {insight.sub && (
                  <p className={`text-xs mt-0.5 opacity-70 ${insight.textColor}`}>{insight.sub}</p>
                )}
                {isClickable && (
                  <p className={`text-xs font-medium mt-1.5 opacity-60 ${insight.textColor}`}>
                    Tap to fix →
                  </p>
                )}
              </div>
              {isClickable && (
                <svg
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 opacity-40 ${insight.textColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          );
        })}

        {/* Summary footer */}
        <div className="pt-4 border-t border-gray-100 mt-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{totalMeals} meal{totalMeals !== 1 ? "s" : ""} planned this week</span>
            <span>{7 - emptyDays.length}/7 days covered</span>
          </div>
          {/* Mini bar chart per meal type */}
          <div className="mt-3 space-y-1.5">
            {MEAL_ORDER.map((mt) => {
              const count = weekPlans.filter((p) => p.meal_type === mt).length;
              const pct = Math.round((count / 7) * 100);
              const barColors: Record<string, string> = {
                breakfast: "bg-amber-400",
                lunch: "bg-green-400",
                dinner: "bg-violet-400",
                snack: "bg-orange-400",
              };
              return (
                <div key={mt} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-16 capitalize">{mt}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColors[mt]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
