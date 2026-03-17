"use client";

import { useState, useRef, useEffect } from "react";

interface RecipePromptInputProps {
  onSubmit: (prompt: string, context: "all" | "my_kitchen") => void;
  loading: boolean;
  pantryCount: number;
}

const SUGGESTIONS = [
  "Quick weeknight dinner",
  "Healthy meal prep",
  "Something with what I have",
  "Impress my friends",
];

export default function RecipePromptInput({
  onSubmit,
  loading,
  pantryCount,
}: RecipePromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState<"all" | "my_kitchen">(
    pantryCount > 0 ? "my_kitchen" : "all"
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }
  }, [prompt]);

  function handleSubmit() {
    if (!prompt.trim() || loading) return;
    onSubmit(prompt.trim(), context);
  }

  function handleSuggestion(text: string) {
    setPrompt(text);
    onSubmit(text, context);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        {/* Context toggle */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-400 mr-1">Context:</span>
          <button
            onClick={() => setContext("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              context === "all"
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setContext("my_kitchen")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              context === "my_kitchen"
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            My Kitchen{pantryCount > 0 && ` (${pantryCount})`}
          </button>
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to cook?"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent py-1 min-h-[32px] max-h-[96px]"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || loading}
            className="w-8 h-8 flex items-center justify-center bg-orange-600 text-white rounded-full hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
          >
            {loading ? (
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Context hint */}
        <p className="text-[11px] text-gray-300 mt-2">
          {context === "my_kitchen"
            ? "Recipes based on your pantry, equipment & saved recipes"
            : "Discover trending recipes from across the internet"}
        </p>
      </div>

      {/* Suggestion chips */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
