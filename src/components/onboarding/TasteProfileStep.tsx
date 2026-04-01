"use client";

import { useState, useEffect, useMemo } from "react";
import SAMPLE_RECIPES from "./data/sample-recipes";
import { TASTE_DIMENSIONS, scoreTasteProfile, getTopTraits } from "./data/taste-dimensions";
import KITCHEN_PALS from "./data/kitchen-pals";

interface Props {
  likedRecipeIds: string[];
  kitchenPal: string | null;
  onNext: (profile: Record<string, string[]>) => void;
}

export default function TasteProfileStep({ likedRecipeIds, kitchenPal, onNext }: Props) {
  const [phase, setPhase] = useState<"loading" | "reveal" | "share">("loading");
  const [showShare, setShowShare] = useState(false);

  const pal = KITCHEN_PALS.find((p) => p.id === kitchenPal);

  // Compute profile
  const likedRecipes = useMemo(
    () => SAMPLE_RECIPES.filter((r) => likedRecipeIds.includes(r.id)),
    [likedRecipeIds]
  );

  const scores = useMemo(() => scoreTasteProfile(likedRecipes), [likedRecipes]);
  const topTraits = useMemo(() => getTopTraits(scores), [scores]);

  // Build simplified profile for storage
  const profileData = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const dim of TASTE_DIMENSIONS) {
      const dimTraits = topTraits
        .filter((t) => t.dimension === dim.label)
        .map((t) => t.trait);
      if (dimTraits.length > 0) result[dim.key] = dimTraits;
    }
    return result;
  }, [topTraits]);

  // Loading -> reveal
  useEffect(() => {
    const t = setTimeout(() => setPhase("reveal"), 2200);
    return () => clearTimeout(t);
  }, []);

  // Max score for normalizing bars
  const maxScore = Math.max(...topTraits.map((t) => t.score), 1);

  if (phase === "loading") {
    return (
      <div className="flex flex-col h-full items-center justify-center px-6" style={{ background: "#faf9f7" }}>
        <div className="text-center space-y-6">
          {pal && (
            <span className="text-7xl block animate-pulse-soft">{pal.emoji}</span>
          )}
          <div>
            <h2 className="text-2xl font-black" style={{ color: "#1a1410" }}>
              Analyzing your taste...
            </h2>
            <p className="text-sm mt-2" style={{ color: "#a09890" }}>
              {pal ? `${pal.name} is figuring you out` : "Building your profile"}
            </p>
          </div>
          <div className="flex justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  background: "#ea580c",
                  animation: `pulse-soft 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-8">
      <div className="pt-4 pb-4 px-6 text-center">
        <h1 className="text-[26px] font-black tracking-tight animate-stagger-in" style={{ color: "#1a1410" }}>
          Your <span style={{ color: "#ea580c" }}>Taste Profile</span>
        </h1>
      </div>

      {/* Profile card */}
      <div className="flex-1 overflow-y-auto px-6">
        <div
          className="animate-profile-reveal rounded-3xl p-6 space-y-6"
          style={{
            background: "white",
            border: "2px solid #e8e8e5",
            boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
          }}
        >
          {/* Top traits as tags */}
          <div className="flex flex-wrap gap-2 justify-center">
            {topTraits.slice(0, 6).map((trait, i) => (
              <span
                key={trait.trait + trait.dimension}
                className="animate-stagger-in inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  animationDelay: `${0.3 + i * 0.08}s`,
                  background: `${trait.color}15`,
                  color: trait.color,
                  border: `1.5px solid ${trait.color}30`,
                }}
              >
                {trait.emoji} {trait.label}
              </span>
            ))}
          </div>

          {/* Dimension bars */}
          <div className="space-y-4 pt-2">
            {TASTE_DIMENSIONS.map((dim, di) => {
              const dimScores = scores[dim.key];
              const topValues = Object.entries(dimScores)
                .filter(([, s]) => s > 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3);

              if (topValues.length === 0) return null;

              return (
                <div
                  key={dim.key}
                  className="animate-stagger-in"
                  style={{ animationDelay: `${0.5 + di * 0.1}s` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{dim.emoji}</span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: dim.color }}>
                      {dim.label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {topValues.map(([traitId, score]) => {
                      const label = dim.values.find((v) => v.id === traitId)?.label || traitId;
                      const width = Math.max((score / maxScore) * 100, 15);
                      return (
                        <div key={traitId} className="flex items-center gap-3">
                          <span className="text-xs w-24 text-right font-medium" style={{ color: "#888" }}>
                            {label}
                          </span>
                          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#f3f2f0" }}>
                            <div
                              className="h-full rounded-full animate-bar-fill"
                              style={{
                                width: `${width}%`,
                                background: `linear-gradient(90deg, ${dim.color}90, ${dim.color})`,
                                animationDelay: `${0.6 + di * 0.1}s`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Improvement note */}
        <div className="text-center mt-5 animate-stagger-in" style={{ animationDelay: "1.2s" }}>
          <p className="text-xs" style={{ color: "#a09890" }}>
            The more recipes you save and meals you add,<br />
            the better your taste profile gets
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-4 px-6 space-y-3">
        <button
          onClick={() => setShowShare(true)}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
          style={{ background: "white", color: "#1a1410", border: "2px solid #e8e8e5" }}
        >
          Share my profile
        </button>
        <button
          onClick={() => onNext(profileData)}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
          style={{ background: "#ea580c" }}
        >
          Enter Marco
        </button>
      </div>

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowShare(false)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 space-y-4 animate-slide-up">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto sm:hidden" />
            <h3 className="text-xl font-bold text-center" style={{ color: "#1a1410" }}>
              Share Your Taste Profile
            </h3>

            <div className="text-center space-y-1 p-4 rounded-xl" style={{ background: "#faf9f7" }}>
              {pal && <span className="text-4xl block mb-2">{pal.emoji}</span>}
              <p className="text-sm font-semibold" style={{ color: "#1a1410" }}>
                My top flavors:
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {topTraits.slice(0, 4).map((t) => (
                  <span key={t.trait} className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: `${t.color}15`, color: t.color }}>
                    {t.emoji} {t.label}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={async () => {
                const text = `My Marco taste profile: ${topTraits.slice(0, 4).map((t) => t.label).join(", ")}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "My Taste Profile", text });
                  } catch { /* user cancelled */ }
                } else {
                  await navigator.clipboard.writeText(text);
                }
                setShowShare(false);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
              style={{ background: "#ea580c" }}
            >
              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? "Share" : "Copy to clipboard"}
            </button>

            <button
              onClick={() => setShowShare(false)}
              className="w-full py-3 text-sm font-semibold"
              style={{ color: "#a09890" }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
