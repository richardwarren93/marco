"use client";

import { useState, useRef, useCallback } from "react";
import SAMPLE_RECIPES, { type SampleRecipe, getRecipesByType } from "./data/sample-recipes";

interface Props {
  likedRecipes: string[];
  onNext: (liked: string[], skipped: string[]) => void;
}

const MEAL_TYPES: SampleRecipe["meal_type"][] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
const MEAL_TYPE_EMOJIS: Record<string, string> = {
  breakfast: "\u{1F95E}",
  lunch: "\u{1F957}",
  dinner: "\u{1F35D}",
  snack: "\u{1F370}",
};

export default function TasteSwipeStep({ likedRecipes: initLiked, onNext }: Props) {
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [liked, setLiked] = useState<string[]>(initLiked);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const currentType = MEAL_TYPES[categoryIdx];
  const cards = getRecipesByType(currentType);
  const currentCard = cards[cardIdx];
  const isLastCard = cardIdx >= cards.length - 1;
  const isLastCategory = categoryIdx >= MEAL_TYPES.length - 1;

  const advanceCard = useCallback(
    (direction: "left" | "right") => {
      if (!currentCard) return;
      setSwipeDir(direction);

      if (direction === "right") {
        setLiked((prev) => [...prev, currentCard.id]);
      } else {
        setSkipped((prev) => [...prev, currentCard.id]);
      }

      setTimeout(() => {
        setSwipeDir(null);
        setDragX(0);
        if (isLastCard) {
          if (isLastCategory) {
            // Done - will be called in the timeout
          } else {
            setCategoryIdx((prev) => prev + 1);
            setCardIdx(0);
          }
        } else {
          setCardIdx((prev) => prev + 1);
        }
      }, 350);
    },
    [currentCard, isLastCard, isLastCategory]
  );

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientX - startX.current;
    setDragX(delta);
  };

  const onTouchEnd = () => {
    isDragging.current = false;
    if (Math.abs(dragX) > 80) {
      advanceCard(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  };

  // Mouse handlers for desktop
  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    isDragging.current = true;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    setDragX(delta);
  };

  const onMouseUp = () => {
    isDragging.current = false;
    if (Math.abs(dragX) > 80) {
      advanceCard(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  };

  // Check if we're done
  if (isLastCard && isLastCategory && swipeDir) {
    // Finish after animation
    setTimeout(() => {
      onNext(liked, skipped);
    }, 400);
  }

  // If all done and no more to show
  if (categoryIdx >= MEAL_TYPES.length) {
    onNext(liked, skipped);
    return null;
  }

  const rotation = dragX * 0.08;
  const likeOpacity = Math.min(Math.max(dragX / 100, 0), 1);
  const skipOpacity = Math.min(Math.max(-dragX / 100, 0), 1);

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      <div className="pt-2 pb-4 text-center">
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          Build your <span style={{ color: "#ea580c" }}>taste profile</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: "#a09890" }}>
          Swipe right to like, left to skip
        </p>
      </div>

      {/* Category indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {MEAL_TYPES.map((type, i) => (
          <div
            key={type}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: i === categoryIdx ? "#fff4ec" : "transparent",
              color: i === categoryIdx ? "#ea580c" : i < categoryIdx ? "#22c55e" : "#d4d0cc",
              border: i === categoryIdx ? "1.5px solid #ea580c" : "1.5px solid transparent",
            }}
          >
            <span>{MEAL_TYPE_EMOJIS[type]}</span>
            {i === categoryIdx && <span>{MEAL_TYPE_LABELS[type]}</span>}
            {i < categoryIdx && (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Progress within category */}
      <div className="text-center text-xs font-medium mb-3" style={{ color: "#a09890" }}>
        {cardIdx + 1} / {cards.length}
      </div>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center relative" style={{ touchAction: "pan-y" }}>
        {/* Direction hints */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-3xl opacity-20" style={{ color: "#ef4444" }}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-3xl opacity-20" style={{ color: "#22c55e" }}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>

        {currentCard && (
          <div
            className={`w-full max-w-[280px] rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none ${
              swipeDir === "right" ? "animate-swipe-right" :
              swipeDir === "left" ? "animate-swipe-left" : ""
            }`}
            style={{
              background: "white",
              border: "2px solid #e8e8e5",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              transform: swipeDir ? undefined : `translateX(${dragX}px) rotate(${rotation}deg)`,
              transition: swipeDir ? undefined : isDragging.current ? "none" : "transform 0.3s ease",
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { if (isDragging.current) onMouseUp(); }}
          >
            {/* Like / Skip overlays */}
            <div
              className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl font-bold text-sm border-2"
              style={{
                opacity: likeOpacity,
                color: "#22c55e",
                borderColor: "#22c55e",
                background: "rgba(255,255,255,0.95)",
                transform: `rotate(12deg)`,
              }}
            >
              LIKE
            </div>
            <div
              className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl font-bold text-sm border-2"
              style={{
                opacity: skipOpacity,
                color: "#ef4444",
                borderColor: "#ef4444",
                background: "rgba(255,255,255,0.95)",
                transform: `rotate(-12deg)`,
              }}
            >
              SKIP
            </div>

            {/* Card image */}
            <div
              className="h-52 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}
            >
              <span className="text-8xl">{currentCard.image_emoji}</span>
            </div>

            {/* Card body */}
            <div className="p-5">
              <h3 className="text-lg font-bold" style={{ color: "#1a1410" }}>
                {currentCard.title}
              </h3>
              <p className="text-xs mt-1" style={{ color: "#a09890" }}>
                {currentCard.description}
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {currentCard.tags.map((tag) => (
                  <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#f3f2f0", color: "#888" }}>
                    {tag}
                  </span>
                ))}
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#fff4ec", color: "#ea580c" }}>
                  {currentCard.prep_time + currentCard.cook_time} min
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Button shortcuts */}
      <div className="flex gap-4 justify-center pt-4">
        <button
          onClick={() => advanceCard("left")}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "white", border: "2px solid #fecaca" }}
        >
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={() => advanceCard("right")}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "white", border: "2px solid #bbf7d0" }}
        >
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
