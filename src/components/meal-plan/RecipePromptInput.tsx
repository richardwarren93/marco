"use client";

import { useState, useRef, useEffect } from "react";

export interface PlanSources {
  savedRecipes: boolean;
  pantry: boolean;
  online: boolean;
}

interface RecipePromptInputProps {
  onSubmit: (prompt: string, sources: PlanSources) => void;
  loading: boolean;
  pantryCount: number;
}

const SUGGESTION_CHIPS = [
  "Easy weeknight dinners",
  "Healthy meal prep",
  "Quick 30-min meals",
  "Vegetarian ideas",
  "High-protein breakfasts",
  "Comfort food classics",
];

export default function RecipePromptInput({
  onSubmit,
  loading,
  pantryCount,
}: RecipePromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [sources, setSources] = useState<PlanSources>({
    savedRecipes: true,
    pantry: pantryCount > 0,
    online: false,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
    }
  }, [prompt]);

  function toggleSource(key: keyof PlanSources) {
    setSources((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSubmit() {
    if (!prompt.trim() || loading) return;
    onSubmit(prompt.trim(), sources);
    setPrompt("");
  }

  function handleChip(text: string) {
    onSubmit(text, sources);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const SOURCE_OPTS = [
    { key: "savedRecipes" as keyof PlanSources, label: "Saved" },
    {
      key: "pantry" as keyof PlanSources,
      label: pantryCount > 0 ? `Pantry (${pantryCount})` : "Pantry",
    },
    { key: "online" as keyof PlanSources, label: "Online" },
  ];

  return (
    <div className="space-y-2">
      {/* Command bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Input row */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <svg
            className="w-4 h-4 text-gray-300 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What are you in the mood for?"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent min-h-[22px] max-h-[88px] leading-snug py-0"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || loading}
            className="w-10 h-10 flex items-center justify-center bg-orange-600 text-white rounded-full hover:bg-orange-700 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
          >
            {loading ? (
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Source pills */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5">
          <span className="text-[10px] text-gray-300">From:</span>
          {SOURCE_OPTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSource(key)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                sources[key]
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              {sources[key] ? "✓ " : ""}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick chips */}
      {!loading && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTION_CHIPS.map((s) => (
            <button
              key={s}
              onClick={() => handleChip(s)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
