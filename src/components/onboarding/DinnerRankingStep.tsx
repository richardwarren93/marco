"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import RANKING_RECIPES, { type RankingRecipe } from "./data/ranking-recipes";

interface Props {
  onNext: (rankedIds: string[], recipes: RankingRecipe[]) => void;
}

/* ── Elo helpers ─────────────────────────────────────────────── */

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function updateElo(
  ratings: Map<string, number>,
  winnerId: string,
  loserId: string,
  K = 32,
) {
  const rW = ratings.get(winnerId) ?? 1000;
  const rL = ratings.get(loserId) ?? 1000;
  const eW = expectedScore(rW, rL);
  const eL = expectedScore(rL, rW);
  const next = new Map(ratings);
  next.set(winnerId, rW + K * (1 - eW));
  next.set(loserId, rL + K * (0 - eL));
  return next;
}

/** Pick the most informative next matchup: closest Elo pair not yet seen.
 *  Avoids showing recipes from the previous matchup for a fresher feel. */
function pickMatchup(
  recipes: RankingRecipe[],
  ratings: Map<string, number>,
  seen: Set<string>,
  lastPairIds?: [string, string] | null,
): [RankingRecipe, RankingRecipe] | null {
  let best: [RankingRecipe, RankingRecipe] | null = null;
  let bestDiff = Infinity;
  let fallback: [RankingRecipe, RankingRecipe] | null = null;
  let fallbackDiff = Infinity;

  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const key = pairKey(recipes[i].id, recipes[j].id);
      if (seen.has(key)) continue;
      const diff = Math.abs(
        (ratings.get(recipes[i].id) ?? 1000) -
          (ratings.get(recipes[j].id) ?? 1000),
      );

      // Track fallback (any valid pair) in case we can't avoid repeats
      if (diff < fallbackDiff) {
        fallbackDiff = diff;
        fallback = [recipes[i], recipes[j]];
      }

      // Prefer pairs that don't reuse recipes from previous matchup
      const overlaps = lastPairIds &&
        (lastPairIds.includes(recipes[i].id) || lastPairIds.includes(recipes[j].id));
      if (!overlaps && diff < bestDiff) {
        bestDiff = diff;
        best = [recipes[i], recipes[j]];
      }
    }
  }
  return best || fallback;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Check if top-3 and bottom-3 are clearly separated (gap >= 40 Elo). */
function isRankingStable(ratings: Map<string, number>) {
  const sorted = [...ratings.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length < 6) return false;
  const thirdRating = sorted[2][1];
  const fourthRating = sorted[3][1];
  return thirdRating - fourthRating >= 40;
}

const MAX_MATCHES = 12;
const MIN_MATCHES = 10;

/* ── Component ───────────────────────────────────────────────── */

export default function DinnerRankingStep({ onNext }: Props) {
  const [ratings, setRatings] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    RANKING_RECIPES.forEach((r) => m.set(r.id, 1000));
    return m;
  });
  const [seenPairs, setSeenPairs] = useState<Set<string>>(new Set());
  const [lastPairIds, setLastPairIds] = useState<[string, string] | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [phase, setPhase] = useState<"compare" | "generating">("compare");
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Animation state
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [loserId, setLoserId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Generating animation state
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [showRankings, setShowRankings] = useState(false);

  // Current matchup
  const currentPair = useMemo(
    () => pickMatchup(RANKING_RECIPES, ratings, seenPairs, lastPairIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchCount], // recalc after each match
  );

  // Sorted recipes by Elo (descending)
  const sortedRecipes = useMemo(() => {
    return [...RANKING_RECIPES].sort(
      (a, b) => (ratings.get(b.id) ?? 1000) - (ratings.get(a.id) ?? 1000),
    );
  }, [ratings]);

  // Check if we should end early or hit max
  const shouldEnd = useCallback(
    (count: number, newRatings: Map<string, number>) => {
      if (count >= MAX_MATCHES) return true;
      if (count >= MIN_MATCHES && isRankingStable(newRatings)) return true;
      return false;
    },
    [],
  );

  // Also transition to generating if no more pairs available
  useEffect(() => {
    if (phase === "compare" && !currentPair && matchCount > 0) {
      setPhase("generating");
    }
  }, [currentPair, phase, matchCount]);

  // Generating animation sequence
  useEffect(() => {
    if (phase !== "generating") return;

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setGeneratingProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + 2;
      });
    }, 40);

    // Show rankings after a brief pause
    const rankTimer = setTimeout(() => setShowRankings(true), 600);

    // Auto-advance after generating animation
    const advanceTimer = setTimeout(() => {
      const sorted = [...RANKING_RECIPES].sort(
        (a, b) => (ratings.get(b.id) ?? 1000) - (ratings.get(a.id) ?? 1000),
      );
      onNext(
        sorted.map((r) => r.id),
        sorted,
      );
    }, 3200);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(rankTimer);
      clearTimeout(advanceTimer);
    };
  }, [phase, ratings, onNext]);

  const handlePick = useCallback(
    (winner: RankingRecipe, loser: RankingRecipe) => {
      if (transitioning) return;

      setShowHint(false);
      setWinnerId(winner.id);
      setLoserId(loser.id);
      setTransitioning(true);

      // After animation, update ratings and advance
      setTimeout(() => {
        const newRatings = updateElo(ratings, winner.id, loser.id);
        const newSeen = new Set(seenPairs);
        newSeen.add(pairKey(winner.id, loser.id));
        const newCount = matchCount + 1;

        setRatings(newRatings);
        setSeenPairs(newSeen);
        setLastPairIds([winner.id, loser.id]);
        setMatchCount(newCount);
        setWinnerId(null);
        setLoserId(null);
        setTransitioning(false);

        if (shouldEnd(newCount, newRatings)) {
          setPhase("generating");
        }
      }, 500);
    },
    [ratings, seenPairs, matchCount, transitioning, shouldEnd],
  );

  const handleImgError = (id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  };

  /* ── Generating phase ───────────────────────────────────────── */

  if (phase === "generating") {
    return (
      <div
        className="flex flex-col h-full pb-24"
        style={{ background: "#faf9f7" }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Animated header */}
          <div className="text-4xl mb-4 animate-bounce-slow">🧬</div>
          <h2
            className="text-xl font-black text-center mb-2 animate-stagger-in"
            style={{ color: "#1a1410" }}
          >
            Generating your{" "}
            <span style={{ color: "#ea580c" }}>Taste DNA</span>
          </h2>
          <p
            className="text-sm text-center mb-6 animate-stagger-in"
            style={{ color: "#a09890", animationDelay: "0.1s" }}
          >
            Based on your rankings
          </p>

          {/* Progress bar */}
          <div
            className="w-full max-w-xs h-2 rounded-full overflow-hidden mb-8"
            style={{ background: "#f0ebe4" }}
          >
            <div
              className="h-full rounded-full transition-all duration-100 ease-linear"
              style={{
                background: "linear-gradient(90deg, #ea580c, #f59e0b)",
                width: `${generatingProgress}%`,
              }}
            />
          </div>

          {/* Rankings reveal */}
          {showRankings && (
            <div className="w-full max-w-sm">
              <div className="space-y-2">
                {sortedRecipes.map((recipe, i) => (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-3 animate-stagger-in"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[10px]"
                      style={{
                        background:
                          i === 0
                            ? "#ea580c"
                            : i === 1
                              ? "#f07828"
                              : i === 2
                                ? "#f5a05c"
                                : "#f0ebe4",
                        color: i <= 2 ? "white" : "#999",
                      }}
                    >
                      {i + 1}
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: i <= 2 ? "#1a1410" : "#a09890" }}
                    >
                      {recipe.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <p
            className="text-xs text-center mt-8 px-8 animate-stagger-in"
            style={{ color: "#c4b8aa", animationDelay: "0.8s" }}
          >
            The more recipes you save and meals you plan, the more accurate your
            taste profile becomes
          </p>
        </div>
      </div>
    );
  }

  /* ── Comparison phase ──────────────────────────────────────── */

  if (!currentPair) return null;

  const [recipeA, recipeB] = currentPair;

  return (
    <div
      className="flex flex-col h-full pb-24"
      style={{ background: "#faf9f7" }}
    >
      {/* Progress bar only (no counter) */}
      <div className="px-6 pt-4 pb-1">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "#f0ebe4" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              background: "#ea580c",
              width: `${(matchCount / MAX_MATCHES) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="pt-2 pb-2 px-6 text-center">
        <h1
          className="text-[22px] font-black tracking-tight"
          style={{ color: "#1a1410" }}
        >
          Which would you <span style={{ color: "#ea580c" }}>rather eat</span>?
        </h1>
        {showHint && (
          <p
            className="text-xs mt-1 animate-stagger-in"
            style={{ color: "#c4b8aa" }}
          >
            Tap the dish you prefer
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 relative">
        {[recipeA, recipeB].map((recipe, idx) => {
          const isWinner = winnerId === recipe.id;
          const isLoser = loserId === recipe.id;
          const other = idx === 0 ? recipeB : recipeA;

          return (
            <button
              key={`${matchCount}-${recipe.id}`}
              disabled={transitioning}
              onClick={() => handlePick(recipe, other)}
              className="w-full max-w-sm rounded-3xl overflow-hidden transition-all duration-500 ease-out relative group"
              style={{
                background: "white",
                boxShadow: isWinner
                  ? "0 0 0 3px #ea580c, 0 8px 32px rgba(234,88,12,0.25)"
                  : "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                transform: isWinner
                  ? "scale(1.03) translateY(-4px)"
                  : isLoser
                    ? "scale(0.96) translateY(8px)"
                    : "scale(1)",
                opacity: isLoser ? 0.4 : 1,
              }}
            >
              {/* Image */}
              <div
                className="relative w-full overflow-hidden"
                style={{
                  height: "clamp(120px, 22vh, 200px)",
                  background:
                    "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)",
                }}
              >
                {!imgErrors.has(recipe.id) ? (
                  <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => handleImgError(recipe.id)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">
                    {recipe.emoji}
                  </div>
                )}
                {/* Gradient overlay at bottom of image */}
                <div
                  className="absolute inset-x-0 bottom-0 h-16"
                  style={{
                    background:
                      "linear-gradient(transparent, rgba(255,255,255,0.9))",
                  }}
                />
              </div>

              {/* Info */}
              <div className="px-4 pb-4 pt-1">
                <p
                  className="text-base font-bold"
                  style={{ color: "#1a1410" }}
                >
                  {recipe.title}
                </p>
                <div className="flex gap-1.5 mt-1.5">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "#fef3eb", color: "#c4650a" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Winner glow overlay */}
              {isWinner && (
                <div
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(234,88,12,0.08) 0%, transparent 70%)",
                  }}
                />
              )}
            </button>
          );
        })}

        {/* VS badge */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
          style={{ marginTop: "12px" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shadow-lg"
            style={{
              background: "white",
              color: "#ea580c",
              border: "2px solid #fed7aa",
              boxShadow: "0 4px 16px rgba(234,88,12,0.15)",
            }}
          >
            VS
          </div>
        </div>
      </div>
    </div>
  );
}
