"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportRecipeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportRecipeSheet({ isOpen, onClose }: ImportRecipeSheetProps) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleUrl() {
    onClose();
    router.push("/recipes/new?mode=url");
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
        onClick={extracting ? undefined : onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-2xl shadow-2xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}
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
          <div className="px-4 py-3 space-y-1">
            {/* Paste URL */}
            <button
              onClick={handleUrl}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
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

            {/* Take Photo — camera on mobile, file picker on desktop */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 text-sm">Take Photo</p>
                <p className="text-xs text-gray-400 mt-0.5">Photograph a cookbook or recipe card</p>
              </div>
            </button>

            {/* Choose from Library (mobile) / Upload Photo (desktop) */}
            <button
              onClick={() => libraryInputRef.current?.click()}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <span className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 text-sm sm:hidden">Choose from Library</p>
                <p className="font-medium text-gray-900 text-sm hidden sm:block">Upload Photo</p>
                <p className="text-xs text-gray-400 mt-0.5">Extract a recipe from an image</p>
              </div>
            </button>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 px-4 pt-1">{error}</p>
            )}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
    </>
  );
}
