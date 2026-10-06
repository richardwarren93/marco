"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import MotionSheet from "@/components/ui/MotionSheet";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const COBALT = "#2540E8";
const PINK = "#FF4D9D";
const LAV = "#C9B8FF";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";

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

const inputStyle: React.CSSProperties = { width: "100%", background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px", fontFamily: SANS, fontSize: 15, color: INK, outline: "none" };
const extractBtn: React.CSSProperties = { marginTop: 10, width: "100%", background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 13, border: `2.5px solid ${INK}` };

function Row({ icon, color, iconColor, title, sub, onClick }: { icon: ReactNode; color: string; iconColor: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 transition-transform active:scale-[0.99]" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 14, padding: "12px 14px", textAlign: "left" }}>
      <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 42, height: 42, borderRadius: 11, background: color, border: `2px solid ${INK}`, color: iconColor }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, lineHeight: 1.05 }}>{title}</div>
        <div style={{ fontFamily: SANS, fontSize: 12.5, color: INK, opacity: 0.6, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: INK, fontSize: 18, opacity: 0.4 }}>›</span>
    </button>
  );
}

export default function ImportRecipeSheet({ isOpen, onClose }: ImportRecipeSheetProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [batchPhotos, setBatchPhotos] = useState<BatchPhoto[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const [docResult, setDocResult] = useState<DocumentResult>({ status: "idle", recipes: [], totalExtracted: 0 });

  function handleUrl() { setShowTextInput(false); setShowUrlInput((v) => !v); }

  async function handleUrlExtract() {
    if (!urlValue.trim()) return;
    setExtracting(true); setError("");
    try {
      const res = await fetch("/api/recipes/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urlValue.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract recipe");
      try { sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe)); } catch {}
      onClose(); router.push("/recipes/new?mode=extracted");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to extract recipe. Please try again."); setExtracting(false); }
  }

  async function handleTextExtract() {
    if (!pastedText.trim()) return;
    setExtracting(true); setError("");
    try {
      const res = await fetch("/api/recipes/extract-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: pastedText }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract recipe");
      try { sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe)); } catch {}
      onClose(); router.push("/recipes/new?mode=extracted");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to extract recipe. Please try again."); setExtracting(false); }
  }

  async function processBatch(photos: BatchPhoto[]) {
    setExtracting(true);
    const updated = [...photos];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "extracting" };
      setBatchPhotos([...updated]);
      try {
        const formData = new FormData();
        formData.append("file", updated[i].file);
        const extractRes = await fetch("/api/recipes/extract-image", { method: "POST", body: formData });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error || "Extraction failed");
        updated[i] = { ...updated[i], status: "saving" };
        setBatchPhotos([...updated]);
        const recipe = extractData.recipe;
        const saveRes = await fetch("/api/recipes/save", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: recipe.title, description: recipe.description, ingredients: recipe.ingredients, steps: recipe.steps, servings: recipe.servings, prep_time_minutes: recipe.prep_time_minutes, cook_time_minutes: recipe.cook_time_minutes, tags: recipe.tags || [], meal_type: recipe.tags?.includes("breakfast") ? "breakfast" : recipe.tags?.includes("lunch") ? "lunch" : "dinner", image_url: recipe.image_url || null, notes: "Imported from photo (batch)" }),
        });
        if (!saveRes.ok) { const saveData = await saveRes.json(); throw new Error(saveData.error || "Save failed"); }
        updated[i] = { ...updated[i], status: "done", title: recipe.title };
      } catch (err) {
        updated[i] = { ...updated[i], status: "error", error: err instanceof Error ? err.message : "Failed" };
      }
      setBatchPhotos([...updated]);
    }
    setExtracting(false); setBatchComplete(true);
  }

  function handleBatchClose() {
    batchPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    setBatchPhotos([]); setBatchMode(false); setBatchComplete(false); setExtracting(false);
    onClose(); router.refresh();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    if (files.length > 1) {
      const valid = files.filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024).slice(0, 10);
      if (valid.length === 0) { setError("No valid images selected (under 10MB)"); return; }
      const photos: BatchPhoto[] = valid.map((file) => ({ file, preview: URL.createObjectURL(file), status: "queued" as const }));
      setBatchPhotos(photos); setBatchMode(true); setBatchComplete(false); setError("");
      processBatch(photos);
      return;
    }
    const file = files[0];
    setExtracting(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/recipes/extract-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract recipe");
      try { sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe)); } catch {}
      onClose(); router.push("/recipes/new?mode=extracted");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to extract recipe. Please try again."); setExtracting(false); }
  }

  async function handleDocSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setDocResult({ status: "uploading", recipes: [], totalExtracted: 0 }); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/recipes/extract-document", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process document");
      setDocResult({ status: "done", recipes: data.recipes, totalExtracted: data.totalExtracted, error: data.errors?.length ? `${data.errors.length} recipe(s) failed to save` : undefined });
    } catch (err) {
      setDocResult({ status: "error", recipes: [], totalExtracted: 0, error: err instanceof Error ? err.message : "Failed to process document" });
    }
  }

  function handleDocClose() { setDocResult({ status: "idle", recipes: [], totalExtracted: 0 }); onClose(); router.refresh(); }

  const busy = extracting || docResult.status === "uploading";

  return (
    <MotionSheet open={isOpen} onClose={onClose} dismissable={!busy} label="Add a recipe" z={70} style={{ background: "#EDE7DA", borderTop: `2.5px solid ${INK}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -20px 50px rgba(23,20,16,0.35)", paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
        <div style={{ height: 20 }} />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-1 pb-3">
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 23, color: INK, lineHeight: 1 }}>Add a recipe</div>
            <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 3 }}>Marco reads it and saves it to your Kitchen</div>
          </div>
          {!busy && <button onClick={onClose} aria-label="Close" style={{ fontSize: 22, color: INK, background: "none", border: "none", lineHeight: 1 }}>✕</button>}
        </div>

        {/* ── Document mode ── */}
        {docResult.status !== "idle" ? (
          <div className="px-5 pb-5">
            {docResult.status === "uploading" && <Loading label="Scanning your document…" sub="finding & saving recipes" />}
            {docResult.status === "done" && (
              <div>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, marginBottom: 10 }}>✓ {docResult.recipes.length} recipe{docResult.recipes.length !== 1 ? "s" : ""} imported</div>
                {docResult.error && <p style={{ fontFamily: SANS, fontSize: 12.5, color: "#8A6418", marginBottom: 10 }}>{docResult.error}</p>}
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "40vh" }}>
                  {docResult.recipes.map((r) => (
                    <a key={r.id} href={`/recipes/${r.id}`} className="flex items-center gap-3" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "9px 12px" }}>
                      <span style={{ fontSize: 18 }}>🍽️</span>
                      <span className="flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>{r.title}</span>
                      <span style={{ color: INK, opacity: 0.4 }}>›</span>
                    </a>
                  ))}
                </div>
                <button onClick={handleDocClose} style={{ ...extractBtn, marginTop: 14 }}>Done →</button>
              </div>
            )}
            {docResult.status === "error" && (
              <div className="text-center" style={{ padding: "20px 0" }}>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>Couldn&apos;t read that document</div>
                <p style={{ fontFamily: SANS, fontSize: 13, color: "#4A4742", margin: "6px 0 14px" }}>{docResult.error}</p>
                <button onClick={() => setDocResult({ status: "idle", recipes: [], totalExtracted: 0 })} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: TOMATO, background: "none", border: "none" }}>try again ↻</button>
              </div>
            )}
          </div>
        ) : batchMode ? (
          <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: "70vh" }}>
            <div className="mb-2 flex items-center justify-between">
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK }}>{batchComplete ? `${batchPhotos.filter((p) => p.status === "done").length} of ${batchPhotos.length} saved` : `reading ${batchPhotos.length} photo${batchPhotos.length > 1 ? "s" : ""}…`}</span>
              <span style={{ fontFamily: HAND, fontSize: 13, color: TOMATO }}>{batchPhotos.filter((p) => p.status === "done" || p.status === "error").length}/{batchPhotos.length}</span>
            </div>
            <div className="mb-4 overflow-hidden" style={{ height: 9, borderRadius: 99, background: "rgba(23,20,16,0.08)", border: `1.5px solid ${INK}` }}>
              <div style={{ height: "100%", background: LIME, borderRight: `1.5px solid ${INK}`, width: `${(batchPhotos.filter((p) => p.status === "done" || p.status === "error").length / batchPhotos.length) * 100}%`, transition: "width .3s" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {batchPhotos.map((photo, i) => (
                <div key={i} className="relative overflow-hidden" style={{ borderRadius: 11, border: `2px solid ${INK}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt={`Photo ${i + 1}`} className="h-28 w-full object-cover" style={{ opacity: photo.status === "done" ? 0.85 : photo.status === "error" ? 0.4 : 1 }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {(photo.status === "extracting" || photo.status === "saving") && <div style={{ width: 26, height: 26, border: `3px solid ${PAPER}`, borderTopColor: "transparent", borderRadius: 99, animation: "irs-spin .8s linear infinite" }} />}
                    {photo.status === "done" && <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 99, background: LIME, border: `2px solid ${INK}`, fontSize: 15 }}>✓</span>}
                    {photo.status === "error" && <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 99, background: TOMATO, color: PAPER, border: `2px solid ${INK}`, fontSize: 14 }}>✕</span>}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 10.5, color: PAPER, padding: "10px 6px 4px", background: "linear-gradient(to top, rgba(23,20,16,0.8), transparent)" }}>
                    {photo.status === "done" && photo.title ? photo.title : photo.status === "extracting" ? "reading…" : photo.status === "saving" ? "saving…" : photo.status === "error" ? photo.error || "failed" : "queued"}
                  </div>
                </div>
              ))}
            </div>
            {batchComplete && <button onClick={handleBatchClose} style={{ ...extractBtn, marginTop: 14 }}>Done — view recipes →</button>}
          </div>
        ) : extracting ? (
          <Loading label="Reading your recipe…" sub="this takes a few seconds" />
        ) : (
          /* ── Options ── */
          <div className="px-4 pb-2" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row color={COBALT} iconColor={PAPER} title="Paste a link" sub="Instagram, TikTok, any recipe site" onClick={handleUrl}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>} />
            {showUrlInput && (
              <div style={{ padding: "0 2px 2px" }}>
                <input autoFocus type="url" inputMode="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleUrlExtract(); }} placeholder="paste recipe URL…" style={inputStyle} />
                <button onClick={handleUrlExtract} disabled={!urlValue.trim()} className="disabled:opacity-40" style={extractBtn}>Extract recipe →</button>
              </div>
            )}

            <Row color={TOMATO} iconColor={PAPER} title="Snap a photo" sub="a cookbook page or screenshot" onClick={() => { setShowTextInput(false); setShowUrlInput(false); photoInputRef.current?.click(); }}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>} />

            <Row color={LIME} iconColor={INK} title="Paste text" sub="copy a recipe from anywhere" onClick={() => { setShowUrlInput(false); setShowTextInput((v) => !v); }}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
            {showTextInput && (
              <div style={{ padding: "0 2px 2px" }}>
                <textarea autoFocus value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="paste recipe text here…" rows={5} style={{ ...inputStyle, resize: "none" }} />
                <button onClick={handleTextExtract} disabled={!pastedText.trim()} className="disabled:opacity-40" style={extractBtn}>Extract recipe →</button>
              </div>
            )}

            <Row color={LAV} iconColor={INK} title="Upload a document" sub="PDF, Word, or text file" onClick={() => { setShowTextInput(false); setShowUrlInput(false); docInputRef.current?.click(); }}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>} />

            {error && <p style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, padding: "2px 4px" }}>{error}</p>}
          </div>
        )}

        <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelected} />
        <input ref={docInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleDocSelected} />
        <style>{`@keyframes irs-spin{to{transform:rotate(360deg)}}`}</style>
    </MotionSheet>
  );
}

function Loading({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ padding: "40px 0" }}>
      <div style={{ width: 44, height: 44, border: `4px solid ${TOMATO}`, borderTopColor: "transparent", borderRadius: 99, animation: "irs-spin .8s linear infinite" }} />
      <div className="text-center">
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>{label}</div>
        <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}
