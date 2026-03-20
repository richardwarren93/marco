"use client";

const DIETS = [
  { id: "none", label: "No specific diet", icon: "🍽️" },
  { id: "vegetarian", label: "Vegetarian", icon: "🌱" },
  { id: "vegan", label: "Vegan", icon: "🥬" },
  { id: "high_protein", label: "High-protein", icon: "🍗" },
  { id: "low_carb", label: "Low-carb", icon: "🍞" },
  { id: "gluten_free", label: "Gluten-free", icon: "🌾" },
  { id: "dairy_free", label: "Dairy-free", icon: "🥛" },
];

export default function DietStep({
  selected,
  onChange,
  onNext,
  onBack,
}: {
  selected: string;
  onChange: (diet: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col min-h-[70vh] px-6 animate-[slide-up_0.4s_ease-out]">
      <button onClick={onBack} className="self-start text-gray-400 hover:text-gray-600 mb-4">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Do you follow a specific diet?
      </h1>
      <p className="text-gray-400 text-sm mb-6">This helps Marco suggest better recipes for you</p>

      <div className="space-y-3 flex-1">
        {DIETS.map((diet) => {
          const isSelected = selected === diet.id;
          return (
            <button
              key={diet.id}
              onClick={() => onChange(diet.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-xl">{diet.icon}</span>
              <span className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-700"}`}>
                {diet.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full bg-orange-600 text-white font-semibold py-3.5 rounded-xl hover:bg-orange-700 transition-colors text-lg mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
