"use client";

import { useState, useEffect } from "react";
import type { MealPlanInsights } from "@/types";

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startMonth = weekStart.toLocaleDateString("en-US", { month: "long" });
  const endMonth = end.toLocaleDateString("en-US", { month: "long" });
  if (weekStart.getMonth() === end.getMonth()) {
    return `${startMonth} ${weekStart.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

// Score ring color based on score
function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 60) return "#f59e0b"; // amber-500
  if (score >= 40) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

function getScoreBg(score: number): string {
  if (score >= 80) return "from-green-50 to-emerald-50";
  if (score >= 60) return "from-amber-50 to-yellow-50";
  if (score >= 40) return "from-orange-50 to-amber-50";
  return "from-red-50 to-rose-50";
}

export default function AnalyzeScreen({
  onBack,
  calendarWeek,
}: {
  onBack: () => void;
  calendarWeek: Date;
}) {
  const [insights, setInsights] = useState<MealPlanInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDaily, setShowDaily] = useState(false);

  const weekStart = formatDateKey(calendarWeek);
  const weekLabel = getWeekLabel(calendarWeek);

  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/meal-plan/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekStart }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to analyze");
        setInsights(data.insights);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze meal plan");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [weekStart]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3 max-w-3xl mx-auto">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Weekly Insights</h1>
            <p className="text-xs text-gray-400">{weekLabel}</p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="relative mb-6">
            {/* Animated ring */}
            <svg className="w-28 h-28 animate-spin" style={{ animationDuration: "3s" }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="#f97316" strokeWidth="6"
                strokeDasharray="264" strokeDashoffset="198"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🧑‍🍳</span>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Analyzing your week...</p>
          <p className="text-xs text-gray-400 text-center max-w-[220px]">
            Estimating nutrition and generating personalized insights
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <span className="text-4xl mb-4">📋</span>
          <p className="text-sm font-medium text-gray-700 mb-1">{error}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors"
          >
            Back to meal plan
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && insights && (
        <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">

          {/* ── Score Hero Card ──────────────────────────────────────── */}
          <div className={`bg-gradient-to-br ${getScoreBg(insights.overallScore)} rounded-2xl p-6 text-center border border-white/50 shadow-sm`}>
            <div className="relative w-28 h-28 mx-auto mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={getScoreColor(insights.overallScore)}
                  strokeWidth="6"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * insights.overallScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-gray-900 tabular-nums">{insights.overallScore}</span>
                <span className="text-[10px] text-gray-500 font-medium -mt-0.5">/ 100</span>
              </div>
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">{insights.scoreLabel}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{insights.headline}</p>
          </div>

          {/* ── Macro Summary Strip ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Daily Averages</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Calories", value: `${insights.nutritionAnalysis.dailyCalorieAvg}`, unit: "kcal", color: "text-gray-900", bg: "bg-gray-50" },
                { label: "Protein", value: `${insights.nutritionAnalysis.dailyCalorieAvg ? Math.round(insights.nutritionAnalysis.dailyCalorieAvg * 0.15 / 4) : 0}`, unit: "g", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Carbs", value: `${insights.nutritionAnalysis.dailyCalorieAvg ? Math.round(insights.nutritionAnalysis.dailyCalorieAvg * 0.50 / 4) : 0}`, unit: "g", color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Fat", value: `${insights.nutritionAnalysis.dailyCalorieAvg ? Math.round(insights.nutritionAnalysis.dailyCalorieAvg * 0.35 / 9) : 0}`, unit: "g", color: "text-amber-600", bg: "bg-amber-50" },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                  <p className={`text-lg font-bold ${item.color} tabular-nums`}>{item.value}</p>
                  <p className="text-[10px] text-gray-500 font-medium">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">{insights.nutritionAnalysis.macroBalance}</p>
          </div>

          {/* ── Balance Insights ─────────────────────────────────────── */}
          {insights.balanceInsights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Insights</h3>
              {insights.balanceInsights.map((insight, i) => {
                const severityStyles = {
                  positive: "border-l-green-500 bg-green-50/50",
                  suggestion: "border-l-amber-500 bg-amber-50/50",
                  warning: "border-l-red-400 bg-red-50/50",
                };
                return (
                  <div
                    key={i}
                    className={`rounded-xl border border-gray-100 border-l-4 p-3.5 ${severityStyles[insight.severity]}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">{insight.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{insight.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Variety Score ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Variety</h3>
              <span className="text-sm font-bold text-gray-900">{insights.varietyScore}/10</span>
            </div>
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    i < insights.varietyScore
                      ? insights.varietyScore >= 7
                        ? "bg-green-400"
                        : insights.varietyScore >= 4
                        ? "bg-amber-400"
                        : "bg-red-400"
                      : "bg-gray-100"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{insights.varietyNote}</p>
          </div>

          {/* ── Recommendations ──────────────────────────────────────── */}
          {insights.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Recommendations</h3>
              {insights.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5 flex items-start gap-3"
                >
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">{rec.emoji}</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{rec.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Detailed Breakdown Toggle ────────────────────────────── */}
          <button
            onClick={() => setShowDaily(!showDaily)}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showDaily ? "Hide" : "Show"} detailed breakdown
            <svg
              className={`w-3 h-3 transition-transform ${showDaily ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDaily && (
            <div className="space-y-2 animate-slide-up">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nutrition Detail</h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🔥</span>
                    <p><span className="font-medium text-gray-800">Calories:</span> {insights.nutritionAnalysis.calorieAssessment}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">💪</span>
                    <p><span className="font-medium text-gray-800">Protein:</span> {insights.nutritionAnalysis.proteinAdequacy}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🌾</span>
                    <p><span className="font-medium text-gray-800">Fiber:</span> {insights.nutritionAnalysis.fiberAssessment}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI disclaimer */}
          <p className="text-[10px] text-gray-300 text-center pb-4">
            Nutrition estimates are AI-generated and may not be perfectly accurate.
            Consult a healthcare provider for dietary advice.
          </p>
        </div>
      )}
    </div>
  );
}
