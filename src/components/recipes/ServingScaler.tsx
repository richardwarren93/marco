"use client";

interface ServingScalerProps {
  originalServings: number;
  multiplier: number;
  onChange: (multiplier: number) => void;
}

export default function ServingScaler({
  originalServings,
  multiplier,
  onChange,
}: ServingScalerProps) {
  const currentServings = Math.round(originalServings * multiplier);
  const minServings = 1;
  const maxServings = originalServings * 4;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newServings = parseInt(e.target.value);
    onChange(newServings / originalServings);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 whitespace-nowrap">Servings</span>
      <input
        type="range"
        min={minServings}
        max={maxServings}
        value={currentServings}
        onChange={handleChange}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
      <span className="text-sm font-semibold text-orange-600 min-w-[2rem] text-center">
        {currentServings}
      </span>
    </div>
  );
}
