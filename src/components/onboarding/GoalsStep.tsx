"use client";

const GOALS = [
  { id: "eat_healthier", label: "Eat healthier", icon: "🥗" },
  { id: "save_money", label: "Save money", icon: "💰" },
  { id: "improve_skills", label: "Improve cooking skills", icon: "🔪" },
  { id: "organize_recipes", label: "Organize recipes", icon: "📦" },
  { id: "plan_meals", label: "Plan out meals", icon: "📅" },
  { id: "try_cuisines", label: "Try new cuisines", icon: "🥢" },
];

export default function GoalsStep({
  selected,
  onChange,
  onNext,
  onBack,
}: {
  selected: string[];
  onChange: (goals: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((g) => g !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-col min-h-[70vh] px-6 animate-[slide-up_0.4s_ease-out]">
      <button onClick={onBack} className="self-start text-gray-400 hover:text-gray-600 mb-4">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">What brings you to Marco?</h1>
      <p className="text-gray-400 text-sm mb-6">Select all that apply</p>

      <div className="space-y-3 flex-1">
        {GOALS.map((goal) => {
          const isSelected = selected.includes(goal.id);
          return (
            <button
              key={goal.id}
              onClick={() => toggle(goal.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-xl">{goal.icon}</span>
              <span className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-700"}`}>
                {goal.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={selected.length === 0}
        className="w-full bg-orange-600 text-white font-semibold py-3.5 rounded-xl hover:bg-orange-700 transition-colors text-lg mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
