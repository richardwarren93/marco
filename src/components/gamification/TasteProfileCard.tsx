"use client";

import { useEffect, useState } from "react";

interface TasteScores {
  sweet: number;
  savory: number;
  richness: number;
  tangy: number;
}

const DIMENSIONS = [
  { key: "sweet" as const, label: "Sweet", color: "#ea580c" },
  { key: "savory" as const, label: "Savory", color: "#d97706" },
  { key: "tangy" as const, label: "Tangy", color: "#c2410c" },
  { key: "richness" as const, label: "Richness", color: "#b45309" },
];

export default function TasteProfileCard() {
  const [scores, setScores] = useState<TasteScores | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    fetch("/api/taste-profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && d.all) setScores(d.all);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scores) {
      const t = setTimeout(() => setAnimated(true), 50);
      return () => clearTimeout(t);
    }
  }, [scores]);

  if (!scores) return null;

  const hasData = Object.values(scores).some((v) => v > 0);
  if (!hasData) return null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #fff8f0 0%, #fef3e2 100%)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
      }}
    >
      <h3 className="text-sm font-bold text-gray-800 mb-4">Your Taste Profile</h3>

      <div className="space-y-3">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
              {dim.label}
            </div>
            <div
              className="rounded-full h-3 overflow-hidden"
              style={{ background: "rgba(0,0,0,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: dim.color,
                  width: animated ? `${scores[dim.key]}%` : "0%",
                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-3">
        Evolves as you save and cook more recipes
      </p>
    </div>
  );
}
