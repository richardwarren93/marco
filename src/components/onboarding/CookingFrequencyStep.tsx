"use client";

const RESPONSES: Record<number, string> = {
  1: "Once a week — we'll make it count!",
  2: "Twice a week is a great start!",
  3: "Three days — you're building a habit!",
  4: "Four times a week, nice rhythm!",
  5: "Five days — you're a dedicated cook!",
  6: "Six days — almost every day!",
  7: "Every single day — you're a chef!",
};

export default function CookingFrequencyStep({
  selected,
  onChange,
  onNext,
  onBack,
}: {
  selected: number;
  onChange: (n: number) => void;
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
        How many days a week do you cook?
      </h1>
      <p className="text-gray-400 text-sm mb-8">This helps us set your weekly goal</p>

      <div className="flex justify-center gap-2.5 mb-6">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-11 h-11 rounded-full text-sm font-bold transition-all ${
              n === selected
                ? "bg-orange-600 text-white shadow-md scale-110"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {selected > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 text-center border border-amber-100">
          <p className="text-gray-800 font-medium">{RESPONSES[selected]}</p>
          <p className="text-xs text-gray-400 mt-2">
            Cook {selected} time{selected !== 1 ? "s" : ""} per week to earn a 25 tomato bonus!
          </p>
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={onNext}
        disabled={selected === 0}
        className="w-full bg-orange-600 text-white font-semibold py-3.5 rounded-xl hover:bg-orange-700 transition-colors text-lg mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
