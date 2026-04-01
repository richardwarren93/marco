"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { Recipe } from "@/types";

interface Props {
  onNext: () => void;
}

const FALLBACK_URL = "https://instagram.com/p/crispy-garlic-salmon";

export default function RecipeDemoStep({ onNext }: Props) {
  const [phase, setPhase] = useState<"intro" | "typing" | "loading" | "reveal">("intro");
  const [typed, setTyped] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [imgError, setImgError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch a real recipe from the DB on mount
  useEffect(() => {
    fetch("/api/recipes/trending")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.recipes?.length > 0) {
          // Pick the first recipe that has an image, or just the first one
          const withImage = data.recipes.find((r: Recipe) => r.image_url);
          setRecipe(withImage || data.recipes[0]);
        }
      })
      .catch(() => { /* use fallback */ });
  }, []);

  const demoUrl = recipe?.source_url || FALLBACK_URL;

  // Brief intro, then start typing
  useEffect(() => {
    const t = setTimeout(() => setPhase("typing"), 800);
    return () => clearTimeout(t);
  }, []);

  // Auto-type the URL
  useEffect(() => {
    if (phase !== "typing") return;
    let idx = 0;
    const url = demoUrl.length > 45 ? demoUrl.slice(0, 45) + "..." : demoUrl;
    intervalRef.current = setInterval(() => {
      idx++;
      setTyped(url.slice(0, idx));
      if (idx >= url.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => setPhase("loading"), 400);
      }
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, demoUrl]);

  // Loading -> reveal
  useEffect(() => {
    if (phase === "loading") {
      const t = setTimeout(() => setPhase("reveal"), 1600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Display data — use real recipe if available, otherwise fallback
  const title = recipe?.title || "Garlic Butter Salmon";
  const description = recipe?.description || "Pan-seared salmon in a rich garlic butter sauce";
  const ingredients = recipe?.ingredients || [];
  const tags = recipe?.tags || ["seafood", "keto"];
  const prepTime = (recipe?.prep_time_minutes || 5) + (recipe?.cook_time_minutes || 15);
  const imageUrl = recipe?.image_url;
  const mealEmoji = recipe?.meal_type === "breakfast" ? "\u{1F95E}" : recipe?.meal_type === "lunch" ? "\u{1F957}" : recipe?.meal_type === "snack" ? "\u{1F370}" : "\u{1F35D}";

  return (
    <div className="flex flex-col h-full pb-8" style={{ background: "#faf9f7" }}>
      <div className="pt-4 pb-3 px-6 text-center">
        <h1 className="text-[26px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          See the <span style={{ color: "#ea580c" }}>magic</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: "#a09890" }}>
          Paste any recipe link and Marco extracts it instantly
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="max-w-md mx-auto">
          {/* URL input */}
          <div className="animate-stagger-in rounded-2xl px-4 py-3 mb-4" style={{ background: "white", border: "2px solid #e8ddd3" }}>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#666" }}>Recipe URL</label>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#a09890" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div className="font-mono text-sm min-h-[24px] flex-1 break-all" style={{ color: "#1a1410" }}>
                {phase === "intro" && <span style={{ color: "#ccc" }}>https://instagram.com/p/...</span>}
                {phase !== "intro" && typed}
                {phase === "typing" && <span className="animate-cursor">&nbsp;</span>}
              </div>
            </div>
          </div>

          {/* Extract button */}
          {(phase === "loading" || phase === "reveal") && (
            <div
              className="animate-stagger-in rounded-2xl py-3.5 text-center mb-5 font-semibold text-sm"
              style={{ background: phase === "loading" ? "#1a1410" : "#22c55e", color: "white" }}
            >
              {phase === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" style={{ animation: "spin 0.8s linear infinite" }} />
                  Extracting recipe...
                </span>
              ) : "Recipe extracted!"}
            </div>
          )}

          {/* Loading skeleton */}
          {phase === "loading" && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div className="skeleton-warm h-44 w-full" />
              <div className="p-4 space-y-3">
                <div className="skeleton-warm h-6 w-3/4 rounded-lg" />
                <div className="skeleton-warm h-4 w-1/2 rounded-lg" />
                <div className="space-y-2 mt-3">
                  <div className="skeleton-warm h-3.5 w-full rounded-lg" />
                  <div className="skeleton-warm h-3.5 w-5/6 rounded-lg" />
                  <div className="skeleton-warm h-3.5 w-4/6 rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {/* Revealed recipe card — real data */}
          {phase === "reveal" && (
            <div className="animate-card-pop rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
              {/* Image */}
              <div className="h-48 relative flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }}>
                {imageUrl && !imgError ? (
                  <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    className="object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span className="text-8xl">{mealEmoji}</span>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-lg font-bold" style={{ color: "#1a1410" }}>{title}</h3>
                {description && (
                  <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "#a09890" }}>{description}</p>
                )}

                {/* Meta */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#fff4ec", color: "#ea580c" }}>
                    {prepTime} min
                  </span>
                  {tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#f3f2f0", color: "#888" }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Ingredients */}
                {ingredients.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a09890" }}>Ingredients</p>
                    {ingredients.slice(0, 5).map((ing, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "#1a1410" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ea580c" }} />
                        {ing.amount} {ing.unit} {ing.name}
                      </div>
                    ))}
                    {ingredients.length > 5 && (
                      <p className="text-xs" style={{ color: "#a09890" }}>+ {ingredients.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue */}
      {phase === "reveal" && (
        <div className="px-6 pt-4 animate-stagger-in" style={{ animationDelay: "0.3s" }}>
          <button onClick={onNext} className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]" style={{ background: "#1a1410" }}>
            Now let&apos;s build a meal plan
          </button>
        </div>
      )}
    </div>
  );
}
