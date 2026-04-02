"use client";

import { useState } from "react";

interface GoalSettingProps {
  currentTarget: number | null;
  onSaved?: (target: number) => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function GoalSetting({ currentTarget, onSaved }: GoalSettingProps) {
  const [target, setTarget] = useState(currentTarget || 0);
  const [saving, setSaving] = useState(false);

  async function handleSelect(value: number) {
    if (value === target) return;
    setTarget(value);
    setSaving(true);

    try {
      const res = await fetch("/api/cooking-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_target: value }),
      });

      if (res.ok) {
        onSaved?.(value);
      }
    } catch (error) {
      console.error("Goal save error:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="bg-white rounded-2xl p-4 overflow-hidden"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <h3 className="font-bold text-gray-900 text-sm">Weekly Goal</h3>
        </div>
        {target > 0 && (
          <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
            <span className="text-[10px]">🍅</span>
            <span className="text-[10px] font-bold text-green-600">+25 bonus</span>
          </div>
        )}
      </div>

      {/* Day-style streak selector */}
      <div className="flex gap-1.5 justify-between">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const isActive = n <= target;
          const isExact = n === target;
          return (
            <button
              key={n}
              onClick={() => handleSelect(n)}
              disabled={saving}
              className={`flex-1 aspect-square max-w-[42px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90 ${
                isActive
                  ? isExact
                    ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200"
                    : "bg-orange-100 text-orange-600"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              <span className="text-[10px] font-semibold leading-none">{DAY_LABELS[n - 1]}</span>
              <span className={`text-sm font-black leading-none ${isActive && !isExact ? "text-orange-500" : ""}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {target > 0 && (
        <p className="text-[11px] text-gray-400 mt-2.5 text-center">
          Cook <span className="font-semibold text-gray-600">{target}x</span> per week to earn your tomato bonus
        </p>
      )}
    </div>
  );
}
