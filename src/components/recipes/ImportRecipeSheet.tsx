"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportRecipeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportRecipeSheet({ isOpen, onClose }: ImportRecipeSheetProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [pastedText, setPastedText] = useState("");

  if (!isOpen) return null;

  function handleUrl() {
    onClose();
    router.push("/recipes/new?mode=url");
  }

  async function handleTextExtract() {
    if (!pastedText.trim()) return;
    setExtracting(true);
    setError("");
    try {
      const res = await fetch("/api/recipes/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract recipe");
      try { sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe)); } catch {}
      onClose();
      router.push("/recipes/new?mode=extracted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract recipe. Please try again.");
      setExtracting(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be picked again

    setExtracting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/recipes/extract-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract recipe");

      // Store result for /recipes/new?mode=extracted to pick up
      try {
        sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe));
      } catch {
        // sessionStorage full or unavailable — recipe data will just be lost
      }

      onClose();
      router.push("/recipes/new?mode=extracted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract recipe. Please try again.");
      setExtracting(false);
    }
  }

  return (
    <>
      {/* Backdrop + centered container */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center sm:justify-center"
        onClick={extracting ? undefined : onClose}
      >

      {/* Sheet */}
      <div
        className="bg-white rounded-t-2xl shadow-2xl w-full sm:max-w-lg sm:rounded-2xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-base">Import Recipe</h3>
          {!extracting && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Extracting state */}
        {extracting ? (
          <div className="px-5 py-12 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Reading your recipe…</p>
              <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
            </div>
          </div>
        ) : (
          /* Options */
          <div className="px-4 py-2 space-y-0.5">
            {/* Paste URL */}
            <button
              onClick={handleUrl}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <span className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 text-sm">Paste a URL</p>
                <p className="text-xs text-gray-400 mt-0.5">Import from any recipe website</p>
              </div>
            </button>

            {/* Camera */}
            <button
              onClick={() => { setShowTextInput(false); photoInputRef.current?.click(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 text-sm">Camera</p>
                <p className="text-xs text-gray-400 mt-0.5">Photograph a cookbook or recipe card</p>
              </div>
            </button>

            {/* Paste from text */}
            <button
              onClick={() => setShowTextInput((v) => !v)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <span className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 text-sm">Paste from text</p>
                <p className="text-xs text-gray-400 mt-0.5">Copy a recipe from anywhere and paste it</p>
              </div>
            </button>

            {/* Inline text input */}
            {showTextInput && (
              <div className="px-1 pt-1 pb-2">
                <textarea
                  autoFocus
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste recipe text here…"
                  rows={5}
                  className="w-full text-sm text-gray-900 placeholder-gray-300 border border-gray-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                />
                <button
                  onClick={handleTextExtract}
                  disabled={!pastedText.trim()}
                  className="mt-2 w-full py-3 rounded-2xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Extract Recipe
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 px-4 pt-1">{error}</p>
            )}
          </div>
        )}

        {/* Hidden file input — no capture attr so iOS shows its native picker */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
      </div>
    </>
  );
}
