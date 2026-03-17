"use client";

import { useState } from "react";
import { GoalIcon } from "@/components/icons/HandDrawnIcons";

interface GoalSettingProps {
  currentTarget: number | null;
  onSaved?: (target: number) => void;
}

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
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <GoalIcon className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Weekly Cooking Goal</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        How many times do you want to cook per week?
      </p>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            onClick={() => handleSelect(n)}
            disabled={saving}
            className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
              n === target
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {target > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Cook {target} time{target !== 1 ? "s" : ""} per week to earn a 25 tomato bonus!
        </p>
      )}
    </div>
  );
}
