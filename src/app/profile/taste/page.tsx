"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import SubPageHeader from "@/components/layout/SubPageHeader";
import DinnerRankingStep from "@/components/onboarding/DinnerRankingStep";
import { computeFlavorScores, computeCuisineScores } from "@/lib/tasteInference";
import { useToast } from "@/components/ui/Toast";
import type { RankingRecipe } from "@/components/onboarding/data/ranking-recipes";

/* Taste DNA — promoted from a profile card to its own page. Canonical data is
   /api/taste-profile (the self-refreshing 5-dim profile). "Retune my taste"
   re-runs the onboarding dinner ranking and feeds the fresh scores back in as
   the prior (the retune endpoint busts the server cache). */

interface TasteData {
  all: { sweet: number; savory: number; richness: number; tangy: number; spicy: number };
  cuisines?: { id: string; label: string; flag: string }[];
  cookingStyles?: { id: string; label: string; emoji: string }[];
  chef?: { name: string; description: string } | null;
  insights?: { emoji: string; text: string }[];
  signatureMeals?: { title: string; count: number }[];
  signatureDish?: string | null;
}

const DIMENSIONS = [
  { key: "savory" as const, label: "Savory", color: "#E5462E" },
  { key: "sweet" as const, label: "Sweet", color: "#E8A33D" },
  { key: "spicy" as const, label: "Spicy", color: "#c2410c" },
  { key: "tangy" as const, label: "Tangy", color: "#0F4C5C" },
  { key: "richness" as const, label: "Rich", color: "#b45309" },
];

const CARD = {
  background: "#FFFDF7",
  border: "1px solid rgba(28,26,23,0.08)",
  boxShadow: "0 2px 12px rgba(28,26,23,0.05)",
} as const;

const EYEBROW = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color: "#E5462E",
};

export default function TasteDnaPage() {
  const { data, isLoading, mutate } = useSWR<TasteData>("/api/taste-profile", apiFetcher, {
    revalidateOnFocus: false,
  });
  const { showToast } = useToast();
  const [retuning, setRetuning] = useState(false);
  const [saving, setSaving] = useState(false);

  const scores = data?.all;
  const hasData = !!scores && Object.values(scores).some((v) => v > 0);

  async function handleRetuned(_rankedIds: string[], rankedRecipes: RankingRecipe[]) {
    setSaving(true);
    try {
      const newScores = computeFlavorScores(rankedRecipes);
      const cuisines = computeCuisineScores(rankedRecipes).map((c) => c.id);
      const res = await fetch("/api/taste-profile/retune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: newScores, cuisines }),
      });
      if (!res.ok) throw new Error("failed");
      await mutate(); // cache was busted server-side — refetch the fresh profile
      showToast("🧬 Taste DNA retuned", { variant: "success" });
    } catch {
      showToast("Couldn't save your retune — try again");
    } finally {
      setSaving(false);
      setRetuning(false);
    }
  }

  async function handleShare() {
    const top = DIMENSIONS.filter((d) => scores && scores[d.key] > 0)
      .sort((a, b) => (scores![b.key] ?? 0) - (scores![a.key] ?? 0))
      .slice(0, 3)
      .map((d) => d.label);
    const text = `My Marco Taste DNA${data?.chef ? ` look-a-like is ${data.chef.name}` : ""}! Top flavors: ${top.join(", ")} 🔥`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "My Taste DNA", text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast("Copied — paste it anywhere", { variant: "success" });
      }
    } catch { /* cancelled */ }
  }

  // ── Retune mode: the ranking tournament takes over the screen ──
  if (retuning) {
    return (
      <DinnerRankingStep
        step={1}
        totalSteps={1}
        onBack={() => setRetuning(false)}
        onNext={handleRetuned}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <SubPageHeader
        title="Taste DNA"
        right={
          hasData ? (
            <button
              onClick={handleShare}
              aria-label="Share your Taste DNA"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#E5462E" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4M18 8a3 3 0 10-3-3 3 3 0 003 3zM6 15a3 3 0 103-3 3 3 0 00-3 3zM18 22a3 3 0 10-3-3 3 3 0 003 3z" />
              </svg>
            </button>
          ) : undefined
        }
      />

      <div className="max-w-lg mx-auto px-4 pt-1 space-y-3" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        {isLoading ? (
          <>
            <div className="h-24 skeleton-warm rounded-2xl" />
            <div className="h-48 skeleton-warm rounded-2xl" />
          </>
        ) : !hasData ? (
          <div className="text-center py-14 rounded-2xl px-6" style={CARD}>
            <span className="text-4xl block mb-3">🧬</span>
            <p className="font-semibold text-[15px]" style={{ color: "#1C1A17" }}>No Taste DNA yet</p>
            <p className="text-[13px] mt-1.5" style={{ color: "#6B655C" }}>
              Rank a few dinners and we&apos;ll map your taste.
            </p>
          </div>
        ) : (
          <>
            {data?.chef && (
              <div className="rounded-2xl p-4" style={CARD}>
                <p style={EYEBROW}>Your taste look-a-like</p>
                <p className="mt-1.5 mb-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 40, "wght" 600', fontSize: "20px", color: "#1C1A17" }}>
                  {data.chef.name}
                </p>
                <p className="text-[12.5px] leading-snug" style={{ color: "#6B655C" }}>{data.chef.description}</p>
              </div>
            )}

            <div className="rounded-2xl p-4" style={CARD}>
              <p className="mb-3" style={EYEBROW}>Flavor profile</p>
              <div className="space-y-2.5">
                {DIMENSIONS.slice()
                  .sort((a, b) => (scores![b.key] ?? 0) - (scores![a.key] ?? 0))
                  .map((dim) => (
                    <div key={dim.key}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[12px] font-medium" style={{ color: "#1C1A17" }}>{dim.label}</span>
                        <span className="text-[11px] tabular-nums" style={{ color: "#9b938a" }}>{Math.round(scores![dim.key] ?? 0)}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden mt-1" style={{ background: "#efede8" }}>
                        <div className="h-full rounded-full animate-bar-fill" style={{ width: `${Math.max(scores![dim.key] ?? 0, 4)}%`, background: dim.color }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {(data?.cuisines?.length ?? 0) > 0 && (
              <div className="rounded-2xl p-4" style={CARD}>
                <p className="mb-2.5" style={EYEBROW}>Top cuisines</p>
                <div className="flex gap-1.5 flex-wrap">
                  {data!.cuisines!.map((c) => (
                    <span key={c.id} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "#f3f2ef", color: "#1C1A17" }}>
                      {c.flag} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data?.signatureDish && (
              <div className="rounded-2xl px-4 py-3.5" style={CARD}>
                <p style={EYEBROW}>Dream meal</p>
                <p className="mt-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "15px", color: "#1C1A17" }}>
                  &ldquo;{data.signatureDish}&rdquo;
                </p>
              </div>
            )}

            {(data?.insights?.length ?? 0) > 0 && (
              <div className="rounded-2xl p-4" style={CARD}>
                <p className="mb-2.5" style={EYEBROW}>You tend to…</p>
                <div className="space-y-2">
                  {data!.insights!.slice(0, 4).map((ins, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[15px] flex-shrink-0">{ins.emoji}</span>
                      <p className="text-[12.5px] leading-snug" style={{ color: "#4A4742" }}>{ins.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(data?.signatureMeals?.length ?? 0) > 0 && (
              <div className="rounded-2xl p-4" style={CARD}>
                <p className="mb-2.5" style={EYEBROW}>Signature meals</p>
                <div className="space-y-2">
                  {data!.signatureMeals!.map((m, i) => (
                    <div key={m.title} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[10px]" style={{ background: i === 0 ? "#E5462E" : i === 1 ? "#f07828" : "#f5a05c", color: "white" }}>{i + 1}</span>
                      <span className="text-[13px] font-semibold flex-1 truncate" style={{ color: "#1C1A17" }}>{m.title}</span>
                      <span className="text-[11.5px] tabular-nums" style={{ color: "#9b938a" }}>{m.count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!isLoading && (
          <div className="pt-2">
            <button
              onClick={() => setRetuning(true)}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px] text-white active:scale-[0.98] transition-transform disabled:opacity-60"
              style={{ background: "#E5462E" }}
            >
              {saving ? "Saving your retune…" : hasData ? "🧬 Retune my taste" : "🧬 Build my Taste DNA"}
            </button>
            <p className="text-center mt-2 text-[11.5px]" style={{ color: "#9b938a" }}>
              Re-run the ranking — your DNA sharpens as you cook
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
