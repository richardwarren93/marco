"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import RANKING_RECIPES, { type RankingRecipe } from "./data/ranking-recipes";

interface Props {
  onNext: (rankedIds: string[], recipes: RankingRecipe[], signatureDish: string) => void;
}

export default function DinnerRankingStep({ onNext }: Props) {
  const [recipes, setRecipes] = useState<RankingRecipe[]>([...RANKING_RECIPES]);
  const [signatureDish, setSignatureDish] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const touchStartY = useRef(0);
  const touchStartIdx = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const moveItem = useCallback((from: number, to: number) => {
    setRecipes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // Touch drag
  const onTouchStart = (idx: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartIdx.current = idx;
    setDragIdx(idx);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartIdx.current === null || !listRef.current) return;
    const y = e.touches[0].clientY;
    const items = listRef.current.querySelectorAll("[data-rank-item]");
    let target = touchStartIdx.current;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (y > rect.top && y < rect.bottom) { target = i; break; }
    }
    setOverIdx(target);
  };
  const onTouchEnd = () => {
    if (touchStartIdx.current !== null && overIdx !== null && touchStartIdx.current !== overIdx) {
      moveItem(touchStartIdx.current, overIdx);
    }
    setDragIdx(null); setOverIdx(null); touchStartIdx.current = null;
  };

  // Mouse drag
  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (idx: number, e: React.DragEvent) => { e.preventDefault(); setOverIdx(idx); };
  const onDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) moveItem(dragIdx, idx);
    setDragIdx(null); setOverIdx(null);
  };
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const handleImgError = (id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  };

  return (
    <div className="flex flex-col h-full pb-6" style={{ background: "#faf9f7" }}>
      <div className="pt-2 pb-3 px-6 text-center">
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          Rank your <span style={{ color: "#ea580c" }}>favorites</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: "#a09890" }}>
          Drag to reorder — #1 goes on top
        </p>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 space-y-2"
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {recipes.map((recipe, i) => {
          const isDragging = dragIdx === i;
          const isOver = overIdx === i;
          return (
            <div
              key={recipe.id}
              data-rank-item
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(i, e)}
              onDrop={() => onDrop(i)}
              onDragEnd={onDragEnd}
              onTouchStart={(e) => onTouchStart(i, e)}
              className="animate-stagger-in flex items-center gap-3 p-2.5 rounded-2xl cursor-grab active:cursor-grabbing select-none transition-all duration-150"
              style={{
                animationDelay: `${i * 0.05}s`,
                background: isDragging ? "#fff4ec" : "white",
                border: isOver ? "2px dashed #ea580c" : "2px solid transparent",
                boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)",
                opacity: isDragging ? 0.7 : 1,
                transform: isDragging ? "scale(1.02)" : "scale(1)",
              }}
            >
              {/* Rank number */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs"
                style={{
                  background: i === 0 ? "#ea580c" : i === 1 ? "#f07828" : i === 2 ? "#f5a05c" : i <= 4 ? "#fcd5b8" : "#f3f2ef",
                  color: i <= 2 ? "white" : i <= 4 ? "#9a4f1a" : "#888",
                }}
              >
                {i + 1}
              </div>

              {/* Recipe image */}
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}>
                {!imgErrors.has(recipe.id) ? (
                  <Image src={recipe.image} alt={recipe.title} fill className="object-cover" onError={() => handleImgError(recipe.id)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">{recipe.emoji}</div>
                )}
              </div>

              {/* Title + tags */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#1a1410" }}>{recipe.title}</p>
                <div className="flex gap-1 mt-0.5">
                  {recipe.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#f3f2f0", color: "#888" }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Drag handle */}
              <div className="flex-shrink-0" style={{ color: "#ccc" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" d="M8 6h.01M8 10h.01M8 14h.01M8 18h.01M16 6h.01M16 10h.01M16 14h.01M16 18h.01" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signature dish */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#a09890" }}>
          {"\u{1F451}"} My signature dish
        </p>
        <input
          type="text"
          value={signatureDish}
          onChange={(e) => setSignatureDish(e.target.value)}
          placeholder="The one dish everyone asks you to make..."
          className="w-full px-4 py-3 rounded-2xl text-sm bg-white outline-none"
          style={{ border: "2px solid #e8ddd3", color: "#1a1410" }}
        />
      </div>

      {/* Continue */}
      <div className="px-6 pt-2">
        <button
          onClick={() => onNext(recipes.map((r) => r.id), recipes, signatureDish)}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
          style={{ background: "#ea580c" }}
        >
          Generate my taste profile
        </button>
      </div>
    </div>
  );
}
