"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportRecipeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BatchPhoto {
  file: File;
  preview: string;
  status: "queued" | "extracting" | "saving" | "done" | "error";
  title?: string;
  error?: string;
}

interface DocumentResult {
  status: "idle" | "uploading" | "done" | "error";
  recipes: { id: string; title: string }[];
  totalExtracted: number;
  error?: string;
}

export default function ImportRecipeSheet({ isOpen, onClose }: ImportRecipeSheetProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [batchPhotos, setBatchPhotos] = useState<BatchPhoto[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const [docResult, setDocResult] = useState<DocumentResult>({ status: "idle", recipes: [], totalExtracted: 0 });

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

  async function processBatch(photos: BatchPhoto[]) {
    setExtracting(true);
    const updated = [...photos];

    for (let i = 0; i < updated.length; i++) {
      // Update status to extracting
      updated[i] = { ...updated[i], status: "extracting" };
      setBatchPhotos([...updated]);

      try {
        // Extract recipe from image
        const formData = new FormData();
        formData.append("file", updated[i].file);
        const extractRes = await fetch("/api/recipes/extract-image", {
          method: "POST",
          body: formData,
        });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error || "Extraction failed");

        // Save recipe
        updated[i] = { ...updated[i], status: "saving" };
        setBatchPhotos([...updated]);

        const recipe = extractData.recipe;
        const saveRes = await fetch("/api/recipes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            servings: recipe.servings,
            prep_time_minutes: recipe.prep_time_minutes,
            cook_time_minutes: recipe.cook_time_minutes,
            tags: recipe.tags || [],
            meal_type: recipe.tags?.includes("breakfast")
              ? "breakfast"
              : recipe.tags?.includes("lunch")
              ? "lunch"
              : "dinner",
            image_url: recipe.image_url || null,
            notes: "Imported from photo (batch)",
          }),
        });
        if (!saveRes.ok) {
          const saveData = await saveRes.json();
          throw new Error(saveData.error || "Save failed");
        }

        updated[i] = { ...updated[i], status: "done", title: recipe.title };
      } catch (err) {
        updated[i] = {
          ...updated[i],
          status: "error",
          error: err instanceof Error ? err.message : "Failed",
        };
      }
      setBatchPhotos([...updated]);
    }

    setExtracting(false);
    setBatchComplete(true);
  }

  function handleBatchClose() {
    // Clean up object URLs
    batchPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    setBatchPhotos([]);
    setBatchMode(false);
    setBatchComplete(false);
    setExtracting(false);
    onClose();
    // Refresh recipes list
    router.refresh();
  }

  function removeBatchPhoto(index: number) {
    URL.revokeObjectURL(batchPhotos[index].preview);
    setBatchPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = ""; // reset so same file can be picked again

    // Multiple files → batch mode
    if (files.length > 1) {
      const valid = files
        .filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024)
        .slice(0, 10);
      if (valid.length === 0) {
        setError("No valid images selected (under 10MB)");
        return;
      }
      const photos: BatchPhoto[] = valid.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: "queued" as const,
      }));
      setBatchPhotos(photos);
      setBatchMode(true);
      setBatchComplete(false);
      setError("");
      processBatch(photos);
      return;
    }

    // Single file → original flow
    const file = files[0];
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

      try {
        sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe));
      } catch {
        // sessionStorage full or unavailable
      }

      onClose();
      router.push("/recipes/new?mode=extracted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract recipe. Please try again.");
      setExtracting(false);
    }
  }

  async function handleDocSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setDocResult({ status: "uploading", recipes: [], totalExtracted: 0 });
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/recipes/extract-document", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process document");

      setDocResult({
        status: "done",
        recipes: data.recipes,
        totalExtracted: data.totalExtracted,
        error: data.errors?.length ? `${data.errors.length} recipe(s) failed to save` : undefined,
      });
    } catch (err) {
      setDocResult({
        status: "error",
        recipes: [],
        totalExtracted: 0,
        error: err instanceof Error ? err.message : "Failed to process document",
      });
    }
  }

  function handleDocClose() {
    setDocResult({ status: "idle", recipes: [], totalExtracted: 0 });
    onClose();
    router.refresh();
  }

  return (
    <>
      {/* Backdrop + centered container */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center sm:justify-center"
        onClick={extracting || docResult.status === "uploading" ? undefined : onClose}
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

        {/* Document mode */}
        {docResult.status !== "idle" ? (
          <div className="px-5 py-6">
            {docResult.status === "uploading" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-12 h-12 border-[3px] border-violet-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-gray-900">Scanning your document…</p>
                  <p className="text-sm text-gray-400 mt-1">Finding and saving recipes</p>
                </div>
              </div>
            )}
            {docResult.status === "done" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {docResult.recipes.length} recipe{docResult.recipes.length !== 1 ? "s" : ""} imported
                  </p>
                </div>
                {docResult.error && (
                  <p className="text-xs text-amber-600 mb-3">{docResult.error}</p>
                )}
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                  {docResult.recipes.map((r) => (
                    <a
                      key={r.id}
                      href={`/recipes/${r.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-base shrink-0">
                        🍽️
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">{r.title}</span>
                      <svg className="w-4 h-4 text-gray-300 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </div>
                <button
                  onClick={handleDocClose}
                  className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all"
                >
                  Done
                </button>
              </div>
            )}
            {docResult.status === "error" && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Could not process document</p>
                <p className="text-xs text-gray-400 mb-4">{docResult.error}</p>
                <button
                  onClick={() => setDocResult({ status: "idle", recipes: [], totalExtracted: 0 })}
                  className="text-sm text-orange-500 font-medium"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        ) : batchMode ? (
          <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* Batch header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {batchComplete
                  ? `${batchPhotos.filter((p) => p.status === "done").length} of ${batchPhotos.length} recipes imported`
                  : `Importing ${batchPhotos.length} photo${batchPhotos.length > 1 ? "s" : ""}…`}
              </p>
              {/* Progress fraction */}
              <span className="text-xs text-gray-400">
                {batchPhotos.filter((p) => p.status === "done" || p.status === "error").length}/{batchPhotos.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{
                  width: `${(batchPhotos.filter((p) => p.status === "done" || p.status === "error").length / batchPhotos.length) * 100}%`,
                }}
              />
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-2 gap-3">
              {batchPhotos.map((photo, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.preview}
                    alt={`Photo ${i + 1}`}
                    className={`w-full h-28 object-cover ${photo.status === "done" ? "opacity-80" : photo.status === "error" ? "opacity-40" : ""}`}
                  />
                  {/* Status overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {photo.status === "extracting" && (
                      <div className="bg-black/50 rounded-full p-2">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {photo.status === "saving" && (
                      <div className="bg-black/50 rounded-full p-2">
                        <div className="w-6 h-6 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {photo.status === "done" && (
                      <div className="bg-green-500 rounded-full p-1.5">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {photo.status === "error" && (
                      <div className="bg-red-500 rounded-full p-1.5">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Title or status text */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <p className="text-[11px] text-white font-medium truncate">
                      {photo.status === "done" && photo.title
                        ? photo.title
                        : photo.status === "extracting"
                        ? "Reading recipe…"
                        : photo.status === "saving"
                        ? "Saving…"
                        : photo.status === "error"
                        ? photo.error || "Failed"
                        : "Queued"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Done button */}
            {batchComplete && (
              <button
                onClick={handleBatchClose}
                className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all"
              >
                Done — View Recipes
              </button>
            )}
          </div>
        ) : extracting ? (
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
                <p className="font-medium text-gray-900 text-sm">Photos</p>
                <p className="text-xs text-gray-400 mt-0.5">Select one or multiple cookbook pages</p>
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

            {/* Upload document */}
            <button
              onClick={() => { setShowTextInput(false); docInputRef.current?.click(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <span className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 text-sm">Upload document</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, Word doc, or text file with recipes</p>
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

        {/* Hidden file input — multiple enabled for batch */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelected}
        />
        {/* Hidden file input for documents */}
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
          onChange={handleDocSelected}
        />
      </div>
      </div>
    </>
  );
}
