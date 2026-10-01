"use client";

// PROTOTYPE — Marco social pivot, the signature moment: post something you cooked
// and Marco auto-art-directs a beautiful card. Capture → anticipation → reveal
// with flippable treatments (polaroid / receipt / poster). Dev-only.

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postCook, getMyCrews, ensureCrew, type Crew, type RecipeSource } from "@/lib/social";
import CardPeek from "@/components/social/CardPeek";
import CookCard from "@/components/social/CookCard";

type ParsedRecipe = {
  title?: string;
  description?: string;
  ingredients?: { name: string; amount?: string | number; unit?: string }[];
  steps?: string[];
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
};

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const COBALT = "#2540E8";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
const ORANGE = "#FF7A1A";

const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const DISP = '"Marker Felt", Georgia, serif';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

// A short, editable caption seeded from the actual dish.
function captionFor(recipe: { description?: string; title?: string }): string {
  const d = (recipe.description || "").trim();
  if (d) { const first = d.split(". ")[0]; if (first.length <= 80) return first.replace(/\.$/, ""); }
  const t = (recipe.title || "").trim();
  return t ? `just made ${t.toLowerCase()} 🍳` : "";
}

export default function ICooked() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" style={{ background: "#E9E2D3" }} />}>
      <ICookedInner />
    </Suspense>
  );
}

function ICookedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // "I cooked this" from a recipe pre-binds it: the cook joins that recipe's
  // lineage, the attach-a-recipe step is skipped, and the title is pre-filled.
  const preRecipeId = searchParams?.get("recipe") || null;
  const [step, setStep] = useState<"capture" | "recipe" | "cooking" | "reveal">("capture");
  const [photo, setPhoto] = useState<string | null>(null); // your photo — required
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [look, setLook] = useState(0);
  const [file, setFile] = useState<File | null>(null); // real uploaded photo
  const [crew, setCrew] = useState<Crew | null>(null);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [postError, setPostError] = useState("");
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // attach recipe — optional, for a more accurate one than Marco reads off the
  // food photo. Same capabilities as the prior importer: link, text, or a photo
  // of the actual recipe (cookbook page / handwritten card).
  const [sheetMode, setSheetMode] = useState<"menu" | "link" | "text">("menu");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [recipeFile, setRecipeFile] = useState<File | null>(null); // a photo of the actual recipe
  const recipeFileRef = useRef<HTMLInputElement>(null);
  const recipePromise = useRef<Promise<string | null> | null>(null);
  const memoryRef = useRef<string | null>(null);        // extraction_memory id (photo learning)
  const extractedTitleRef = useRef<string | null>(null); // what the model guessed, to detect a correction
  const [reading, setReading] = useState(false); // Marco reading the recipe during "generate"

  const hasRecipe = !!(link.trim() || text.trim() || recipeFile);
  const recipeLabel = recipeFile ? "recipe photo" : link.trim() ? "recipe link" : "recipe text";

  function pickRecipeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setRecipeFile(f); setLink(""); setText(""); setSheetMode("menu"); }
  }
  function clearRecipe() { setLink(""); setText(""); setRecipeFile(null); }

  const requestedTable = searchParams?.get("table");
  useEffect(() => { getMyCrews().then(rows => { setCrews(rows); setCrew(rows.find(c => c.id === requestedTable) ?? rows[0] ?? null); }); }, [requestedTable]);

  // Pre-bound recipe (from "I cooked this"): bind it as the cook's source so it
  // joins the lineage, and seed the title from the recipe name.
  useEffect(() => {
    if (!preRecipeId) return;
    recipePromise.current = Promise.resolve(preRecipeId);
    (async () => {
      try {
        const r = await fetch(`/api/recipes/${preRecipeId}`);
        if (r.ok) { const t = (await r.json()).recipe?.title as string | undefined; if (t) setTitle((v) => v || t); }
      } catch { /* best-effort */ }
    })();
  }, [preRecipeId]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try { setPhoto(URL.createObjectURL(f)); } catch { /* ignore */ }
    // extraction is deferred to the generate step — only run it when actually needed
  }

  // Extract a recipe from a source (food photo, link, text, recipe photo), seed
  // the editable title + note, keep the parsed recipe for the details card, and
  // remember its id to Cook from. Best-effort — never blocks posting.
  async function resolveRecipeFrom(source: RecipeSource) {
    setReading(true);
    try {
      let recipe: ParsedRecipe | null = null;
      if (source.kind === "photo") {
        const fd = new FormData(); fd.append("file", source.file);
        const r = await fetch("/api/recipes/extract-image", { method: "POST", body: fd });
        if (r.ok) { const j = await r.json(); recipe = j.recipe ?? null; memoryRef.current = j.memoryId ?? null; extractedTitleRef.current = recipe?.title ?? null; }
      } else if (source.kind === "link") {
        const r = await fetch("/api/recipes/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: source.url }) });
        if (r.ok) recipe = (await r.json()).recipe ?? null;
      } else {
        const r = await fetch("/api/recipes/extract-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: source.text }) });
        if (r.ok) recipe = (await r.json()).recipe ?? null;
      }
      if (recipe) {
        const rt = recipe.title;
        if (rt) setTitle((t) => t || rt);
        const cap = captionFor(recipe);
        setNote((n) => n || cap);
        const s = await fetch("/api/recipes/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recipe) });
        let id: string | null = null;
        if (s.ok) id = ((await s.json()).recipe?.id as string) ?? null;
        else if (s.status === 409) id = ((await s.json()).recipeId as string) ?? null;
        recipePromise.current = Promise.resolve(id);
      }
    } catch { /* best-effort */ }
    setReading(false);
  }
  async function share() {
    if (posting) return;
    setPosting(true);
    try {
    const recipeId = recipePromise.current ? await recipePromise.current : null; // resolves the extraction started earlier
    setPostError("");
    const target = crew ?? await ensureCrew();
    if (!target) { setPosting(false); setPostError("Choose or create a table before sharing."); return; }
    const posted = await postCook({
      crewId: target?.id ?? null,
      title,
      note,
      treatment: ["polaroid", "receipt", "poster"][look],
      photoFile: file,
      photoUrl: file ? undefined : photo,
      sourceRecipeId: recipeId,
    });
    setPosting(false);
    if (!posted) { setPostError("Your cook could not be shared. Please try again."); return; }
    // Posting = you reviewed it. Confirm the label (kept OR corrected) so
    // visually-similar photos learn from it next time.
    if (memoryRef.current && title.trim()) {
      fetch("/api/recipes/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memoryId: memoryRef.current, dishName: title.trim() }) }).catch(() => { /* best-effort */ });
    }
    router.push("/friends-stack");
    } catch {
      setPostError("Your cook could not be shared. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  // "Generate": the actual work happens here — extract the recipe from the
  // attached source, or (if none) fall back to reading the food photo, then
  // reveal. Deferred to this moment so we don't extract until it's needed.
  useEffect(() => {
    if (step !== "cooking") return;
    let cancelled = false;
    (async () => {
      const source: RecipeSource | null =
        preRecipeId ? null // recipe already bound — don't re-extract, keep the lineage link
        : link.trim() ? { kind: "link", url: link.trim() }
        : text.trim() ? { kind: "text", text: text.trim() }
        : recipeFile ? { kind: "photo", file: recipeFile }
        : file ? { kind: "photo", file }
        : null;
      const started = Date.now();
      if (source) await resolveRecipeFrom(source);
      const wait = 1400 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (!cancelled) { setLook(Math.floor(Math.random() * 3)); setStep("reveal"); }
    })();
    return () => { cancelled = true; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />

      {/* ── STEP 1: the camera (immersive when empty) ── */}
      {step === "capture" && (
        <>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
          {photo ? (
            <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 40 }}>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK }}>I cooked something</span>
                <button onClick={() => router.back()} aria-label="Close" style={{ fontSize: 22, color: INK, background: "none", border: "none" }}>✕</button>
              </div>
              <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 4 }}>ooh — that looks good ✨</div>
              <div style={{ marginTop: 22, position: "relative", transform: "rotate(-1.4deg)" }}>
                <div style={{ background: "#fff", padding: 12, border: `2.5px solid ${INK}`, boxShadow: "0 22px 46px rgba(23,20,16,0.28)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" style={{ width: "100%", height: 420, objectFit: "cover", display: "block" }} />
                </div>
                <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: -12, right: -6, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 99, border: `2px solid ${PAPER}` }}>change photo</button>
              </div>
              <button onClick={() => setStep(preRecipeId ? "cooking" : "recipe")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 30, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)" }}>{preRecipeId ? "Make my card ✨" : "Next →"}</button>
            </div>
          ) : (
            // immersive full-screen "camera": viewfinder + food image fill the whole screen
            <div className="fixed inset-0" style={{ zIndex: 20 }}>
              <button onClick={() => fileRef.current?.click()} aria-label="Snap what you made" className="absolute inset-0 active:opacity-90" style={{ background: "none", border: "none", padding: 0 }}>
                <CardPeek fullBleed label="tap to snap what you made" />
              </button>
              <button onClick={() => router.back()} aria-label="Close" style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 16px)", right: 18, zIndex: 2, fontSize: 24, color: PAPER, background: "rgba(0,0,0,0.3)", border: "none", width: 40, height: 40, borderRadius: 99, lineHeight: 1 }}>✕</button>
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: attach a recipe? (optional — "not right now") ── */}
      {step === "recipe" && (
        <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 40 }}>
          <input ref={recipeFileRef} type="file" accept="image/*" onChange={pickRecipeFile} style={{ display: "none" }} />
          <div className="flex items-center justify-between">
            <button onClick={() => setStep("capture")} aria-label="Back" style={{ fontFamily: HAND, fontSize: 16, color: INK, background: "none", border: "none" }}>← back</button>
            <button onClick={() => { clearRecipe(); setStep("cooking"); }} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, background: "none", border: "none", opacity: 0.7 }}>not right now →</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, color: INK, lineHeight: 1.05 }}>add the recipe?</div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 6 }}>so friends cook exactly what you made — more accurate than a photo alone.</div>
          </div>

          {hasRecipe ? (
            <div style={{ marginTop: 22 }}>
              <div className="flex items-center gap-2" style={{ background: LIME, border: `2px solid ${INK}`, borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 20 }} aria-hidden>📎</span>
                <span style={{ flex: 1, fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }}>{recipeLabel} attached ✓</span>
                <button onClick={clearRecipe} aria-label="Remove" style={{ background: "none", border: "none", fontSize: 18, color: INK, opacity: 0.6 }}>✕</button>
              </div>
              <button onClick={() => setStep("cooking")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 20, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)" }}>Make my card ✨</button>
            </div>
          ) : sheetMode === "menu" ? (
            <div style={{ marginTop: 22 }}>
              <AttachRow emoji="🔗" title="Paste a link" sub="Instagram, TikTok, any recipe site" c={COBALT} onClick={() => setSheetMode("link")} />
              <AttachRow emoji="📖" title="Photo of the recipe" sub="a cookbook page or handwritten card" c={PINK} onClick={() => recipeFileRef.current?.click()} />
              <AttachRow emoji="📝" title="Paste text" sub="copy a recipe from anywhere" c={LIME} onClick={() => setSheetMode("text")} />
            </div>
          ) : sheetMode === "link" ? (
            <div style={{ marginTop: 22 }}>
              <input autoFocus value={link} onChange={(e) => setLink(e.target.value)} placeholder="paste a recipe link…" style={{ width: "100%", background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 14px", fontFamily: SANS, fontSize: 15, color: INK }} />
              <button onClick={() => { if (!link.trim()) return; setText(""); setRecipeFile(null); setStep("cooking"); }} disabled={!link.trim()} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 12, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "15px 0", borderRadius: 14, border: `2.5px solid ${INK}`, opacity: link.trim() ? 1 : 0.4 }}>attach & make my card ✨</button>
              <button onClick={() => setSheetMode("menu")} style={{ marginTop: 10, width: "100%", background: "none", border: "none", fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7 }}>← other options</button>
            </div>
          ) : (
            <div style={{ marginTop: 22 }}>
              <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="paste the recipe text…" rows={6} style={{ width: "100%", background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 14px", fontFamily: SANS, fontSize: 15, color: INK, resize: "none" }} />
              <button onClick={() => { if (!text.trim()) return; setLink(""); setRecipeFile(null); setStep("cooking"); }} disabled={!text.trim()} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 12, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "15px 0", borderRadius: 14, border: `2.5px solid ${INK}`, opacity: text.trim() ? 1 : 0.4 }}>attach & make my card ✨</button>
              <button onClick={() => setSheetMode("menu")} style={{ marginTop: 10, width: "100%", background: "none", border: "none", fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7 }}>← other options</button>
            </div>
          )}
        </div>
      )}

      {step === "cooking" && (
        <div className="relative flex flex-col items-center justify-center" style={{ minHeight: "100dvh", textAlign: "center", padding: 30 }}>
          <div className="mk-plate" style={{ fontSize: 74 }} aria-hidden>🍅</div>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK, marginTop: 18 }}>Marco&apos;s plating your card</div>
          <div style={{ fontFamily: HAND, fontSize: 18, color: TOMATO, marginTop: 6 }}>{reading ? "reading your recipe…" : "art-directing…"} <span className="mk-dot">·</span><span className="mk-dot" style={{ animationDelay: ".2s" }}>·</span><span className="mk-dot" style={{ animationDelay: ".4s" }}>·</span></div>
          <style>{`@keyframes mkp{0%,100%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(8deg) translateY(-8px)}}.mk-plate{animation:mkp 1s ease-in-out infinite}@keyframes mkd{0%,100%{opacity:.2}50%{opacity:1}}.mk-dot{animation:mkd .9s infinite}`}</style>
        </div>
      )}

      {step === "reveal" && (
        <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 22px)", paddingBottom: 40 }}>
          <div className="text-center">
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.3em", color: COBALT }}>YOUR CARD IS READY</div>
            <div style={{ fontFamily: HAND, fontSize: 19, color: TOMATO, marginTop: 4, transform: "rotate(-1.5deg)" }}>Marco made you look good ✨</div>
          </div>

          <div style={{ marginTop: 22 }}>
            <CookCard treatment={["polaroid", "receipt", "poster"][look]} photo={photo ?? ""} title={title} note={note} authorName="you" authorAvatar="Y" timeLabel="just now" />
          </div>

          {/* edit — Marco filled these in; changes update the card live */}
          <div style={{ marginTop: 18 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="name your dish" style={{ width: "100%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px", fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a line about it (optional)" style={{ marginTop: 8, width: "100%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "11px 14px", fontFamily: HAND, fontSize: 16, color: TOMATO }} />
          </div>

          <label className="block mt-5 text-sm font-semibold">Share to table
            <select value={crew?.id ?? ""} onChange={e => setCrew(crews.find(c => c.id === e.target.value) ?? null)} className="block w-full mt-2 rounded-xl border-2 border-[#171410] bg-[#FBF7EE] p-3">
              {crews.length === 0 && <option value="">Your new table</option>}
              {crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {postError && <p role="alert" className="mt-3 text-red-800">{postError}</p>}
          <button onClick={share} disabled={posting} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 22, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.32)", opacity: posting ? 0.6 : 1 }}>{posting ? "sharing…" : `Share to ${crew?.name ?? "your table"} →`}</button>
        </div>
      )}

    </div>
  );
}

function AttachRow({ emoji, title, sub, c, onClick }: { emoji: string; title: string; sub: string; c: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 active:scale-[0.99] transition-transform" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 14, padding: "12px 14px", textAlign: "left", marginBottom: 8 }}>
      <span className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, background: c, border: `2px solid ${INK}`, fontSize: 20, flexShrink: 0 }}>{emoji}</span>
      <div className="flex-1">
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, lineHeight: 1 }}>{title}</div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: INK, opacity: 0.6, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: INK, fontSize: 18, opacity: 0.4 }}>›</span>
    </button>
  );
}
