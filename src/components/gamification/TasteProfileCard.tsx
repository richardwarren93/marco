"use client";

import { useEffect, useState } from "react";

interface TasteScores {
  sweet: number;
  savory: number;
  richness: number;
  tangy: number;
  spicy: number;
}

interface CuisineItem {
  id: string;
  label: string;
  flag: string;
}

interface StyleItem {
  id: string;
  label: string;
  emoji: string;
}

interface InsightItem {
  emoji: string;
  text: string;
}

interface ChefMatch {
  name: string;
  description: string;
}

interface SignatureMeal {
  title: string;
  count: number;
}

interface TasteProfileData {
  all: TasteScores;
  cuisines?: CuisineItem[];
  cookingStyles?: StyleItem[];
  chef?: ChefMatch;
  insights?: InsightItem[];
  signatureMeals?: SignatureMeal[];
}

const DIMENSIONS = [
  { key: "sweet" as const, label: "Sweet", color: "#ea580c" },
  { key: "savory" as const, label: "Savory", color: "#d97706" },
  { key: "spicy" as const, label: "Spicy", color: "#dc2626" },
  { key: "tangy" as const, label: "Tangy", color: "#c2410c" },
  { key: "richness" as const, label: "Richness", color: "#b45309" },
];

export default function TasteProfileCard() {
  const [data, setData] = useState<TasteProfileData | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    fetch("/api/taste-profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && d.all) setData(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => setAnimated(true), 50);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (!data) return null;

  const scores = data.all;
  const hasData = Object.values(scores).some((v) => v > 0);
  if (!hasData) return null;

  return (
    <div className="space-y-3">
      {/* ── Flavor Profile ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #fff8f0 0%, #fef3e2 100%)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
        }}
      >
        <h3 className="text-sm font-bold text-gray-800 mb-4">Your Taste Profile</h3>

        <div className="space-y-3">
          {[...DIMENSIONS].sort((a, b) => (scores[b.key] || 0) - (scores[a.key] || 0)).map((dim) => (
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

      {/* ── Chef Look-A-Like ── */}
      {data.chef && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "white",
            border: "1px solid #eae7e2",
            boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "#ea580c" }}>
            Your Taste Look-A-Like
          </p>
          <p className="text-base font-black" style={{ color: "#1a1410" }}>{data.chef.name}</p>
          <p className="text-xs leading-relaxed mt-1" style={{ color: "#666" }}>{data.chef.description}</p>
        </div>
      )}

      {/* ── Top Cuisines + You Tend To ── */}
      {((data.cuisines && data.cuisines.length > 0) || (data.insights && data.insights.length > 0)) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Top Cuisines */}
          {data.cuisines && data.cuisines.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "white", border: "1px solid #eae7e2" }}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2.5" style={{ color: "#ea580c" }}>
                Top Cuisines
              </p>
              <div className="space-y-2">
                {data.cuisines.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <span className="text-sm">{c.flag}</span>
                    <span className="text-xs font-semibold" style={{ color: "#1a1410" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* You Tend To */}
          {data.insights && data.insights.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "white", border: "1px solid #eae7e2" }}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2.5" style={{ color: "#ea580c" }}>
                You tend to...
              </p>
              <div className="space-y-2">
                {data.insights.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-xs flex-shrink-0">{item.emoji}</span>
                    <span className="text-[11px] leading-tight" style={{ color: "#555" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Signature Meals ── */}
      {data.signatureMeals && data.signatureMeals.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: "white", border: "1px solid #eae7e2", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2.5" style={{ color: "#ea580c" }}>
            Signature Meals
          </p>
          <div className="space-y-2">
            {data.signatureMeals.map((meal, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{i === 0 ? "\u{1F451}" : "\u{1F373}"}</span>
                  <span className="text-xs font-semibold line-clamp-1" style={{ color: "#1a1410" }}>{meal.title}</span>
                </div>
                <span className="text-[10px] font-medium flex-shrink-0 ml-2" style={{ color: "#a09890" }}>
                  {meal.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cooking Style ── */}
      {data.cookingStyles && data.cookingStyles.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: "white", border: "1px solid #eae7e2", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2.5" style={{ color: "#ea580c" }}>
            Cooking Style
          </p>
          <div className="flex gap-2 flex-wrap">
            {data.cookingStyles.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "#f3f2ef" }}>
                <span className="text-xs">{s.emoji}</span>
                <span className="text-xs font-medium" style={{ color: "#1a1410" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
