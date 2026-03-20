"use client";

const SOURCES = [
  { id: "friend", label: "Through a friend", icon: "🗣️" },
  { id: "social_media", label: "Social media", icon: "📱" },
  { id: "search", label: "Search engine", icon: "🔍" },
  { id: "other", label: "Other", icon: "✨" },
];

export default function AttributionStep({
  selected,
  onChange,
  onFinish,
  onBack,
  saving,
}: {
  selected: string;
  onChange: (source: string) => void;
  onFinish: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-col min-h-[70vh] px-6 animate-[slide-up_0.4s_ease-out]">
      <button onClick={onBack} className="self-start text-gray-400 hover:text-gray-600 mb-4">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        How did you hear about Marco?
      </h1>
      <p className="text-gray-400 text-sm mb-6">Just curious!</p>

      <div className="space-y-3 flex-1">
        {SOURCES.map((source) => {
          const isSelected = selected === source.id;
          return (
            <button
              key={source.id}
              onClick={() => onChange(source.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-xl">{source.icon}</span>
              <span className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-700"}`}>
                {source.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onFinish}
        disabled={!selected || saving}
        className="w-full bg-orange-600 text-white font-semibold py-3.5 rounded-xl hover:bg-orange-700 transition-colors text-lg mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? "Setting up..." : "Start Cooking!"}
      </button>
    </div>
  );
}
