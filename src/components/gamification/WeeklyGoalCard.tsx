"use client";

import Link from "next/link";
import { GoalIcon, CheckCircleIcon } from "@/components/icons/HandDrawnIcons";
import { weekLabel, getWeekStart } from "@/lib/gamification";

interface WeeklyGoalCardProps {
  weeklyTarget: number | null;
  weekProgress: number;
}

export default function WeeklyGoalCard({ weeklyTarget, weekProgress }: WeeklyGoalCardProps) {
  if (!weeklyTarget) {
    return (
      <Link
        href="/profile"
        className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <GoalIcon className="w-6 h-6 text-orange-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Set a cooking goal</p>
            <p className="text-xs text-gray-400">Track your weekly cooking progress</p>
          </div>
          <span className="ml-auto text-gray-300 text-sm">→</span>
        </div>
      </Link>
    );
  }

  const isComplete = weekProgress >= weeklyTarget;
  const label = weekLabel(getWeekStart());

  return (
    <div className={`rounded-2xl shadow-sm p-4 ${isComplete ? "bg-green-50" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
          ) : (
            <GoalIcon className="w-5 h-5 text-orange-500" />
          )}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${isComplete ? "text-green-600" : "text-gray-500"}`}>
          {weekProgress}/{weeklyTarget}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: weeklyTarget }, (_, i) => (
          <div
            key={i}
            className={`h-2.5 flex-1 rounded-full transition-colors ${
              i < weekProgress
                ? isComplete
                  ? "bg-green-500"
                  : "bg-orange-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {isComplete && (
        <p className="text-xs text-green-600 font-medium mt-2 text-center">
          Goal complete! +25 bonus tomatoes earned
        </p>
      )}
    </div>
  );
}
