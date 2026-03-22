"use client";

type UnitSystem = "us" | "metric";

interface UnitToggleProps {
  system: UnitSystem;
  onChange: (system: UnitSystem) => void;
}

export default function UnitToggle({ system, onChange }: UnitToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => onChange("us")}
        className={`px-3 py-1 text-sm font-medium transition-colors ${
          system === "us"
            ? "bg-orange-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        US
      </button>
      <button
        onClick={() => onChange("metric")}
        className={`px-3 py-1 text-sm font-medium transition-colors ${
          system === "metric"
            ? "bg-orange-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        Metric
      </button>
    </div>
  );
}
