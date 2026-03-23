"use client";

const STEPS = ["Choose", "Review", "Schedule"] as const;

export default function MealPlanStepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1 text-sm">
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        return (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors ${
                active ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              <span className="text-xs opacity-80">{n}</span>
              <span>{label}</span>
            </div>
            {i < 2 && <span className="text-gray-300 text-xs">—</span>}
          </div>
        );
      })}
    </div>
  );
}
