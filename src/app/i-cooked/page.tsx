"use client";

// PROTOTYPE — Marco social pivot, the signature moment: post something you cooked
// and Marco auto-art-directs a beautiful card. Capture → anticipation → reveal
// with flippable treatments (polaroid / receipt / poster). Dev-only.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postCook, getPrimaryCrew, ensureCrew, type Crew, type RecipeSource } from "@/lib/social";
import CardPeek from "@/components/social/CardPeek";

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
  const router = useRouter();
  const [step, setStep] = useState<"capture" | "recipe" | "cooking" | "reveal">("capture");
  const [photo, setPhoto] = useState<string | null>(null); // your photo — required
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [look, setLook] = useState(0);
  const [file, setFile] = useState<File | null>(null); // real uploaded photo
  const [crew, setCrew] = useState<Crew | null>(null);
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
  const [reading, setReading] = useState(false); // Marco reading the recipe during "generate"

  const hasRecipe = !!(link.trim() || text.trim() || recipeFile);
  const recipeLabel = recipeFile ? "recipe photo" : link.trim() ? "recipe link" : "recipe text";

  function pickRecipeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setRecipeFile(f); setLink(""); setText(""); setSheetMode("menu"); }
  }
  function clearRecipe() { setLink(""); setText(""); setRecipeFile(null); }

  useEffect(() => { getPrimaryCrew().then(setCrew); }, []);

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
        if (r.ok) recipe = (await r.json()).recipe ?? null;
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
    const recipeId = recipePromise.current ? await recipePromise.current : null; // resolves the extraction started earlier
    const target = await ensureCrew(); // always post into a group (auto-create if none)
    await postCook({
      crewId: target?.id ?? null,
      title,
      note,
      treatment: ["polaroid", "receipt", "poster"][look],
      photoFile: file,
      photoUrl: file ? undefined : photo,
      sourceRecipeId: recipeId,
    });
    setPosting(false);
    router.push("/friends-stack");
  }

  // "Generate": the actual work happens here — extract the recipe from the
  // attached source, or (if none) fall back to reading the food photo, then
  // reveal. Deferred to this moment so we don't extract until it's needed.
  useEffect(() => {
    if (step !== "cooking") return;
    let cancelled = false;
    (async () => {
      const source: RecipeSource | null =
        link.trim() ? { kind: "link", url: link.trim() }
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
    <div className="min-h-[100dvh] w-full" style={{ background: step === "reveal" ? INK : "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      {step !== "reveal" && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />}

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
              <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 4 }}>looking good — post it?</div>
              <div style={{ marginTop: 22, position: "relative", transform: "rotate(-1.4deg)" }}>
                <div style={{ background: "#fff", padding: 12, border: `2.5px solid ${INK}`, boxShadow: "0 22px 46px rgba(23,20,16,0.28)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" style={{ width: "100%", height: 420, objectFit: "cover", display: "block" }} />
                </div>
                <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: -12, right: -6, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 99, border: `2px solid ${PAPER}` }}>change photo</button>
              </div>
              <button onClick={() => setStep("recipe")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 30, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)" }}>Next →</button>
            </div>
          ) : (
            // immersive full-screen "camera": viewfinder + food image fill the whole screen
            <div className="fixed inset-0" style={{ zIndex: 20 }}>
              <button onClick={() => fileRef.current?.click()} aria-label="Snap what you made" className="absolute inset-0 active:opacity-90" style={{ background: "none", border: "none", padding: 0 }}>
                <CardPeek fullBleed label="snap what you made" />
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
            <button onClick={() => { clearRecipe(); setStep("cooking"); }} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, background: "none", border: "none", opacity: 0.55 }}>not right now →</button>
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
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.3em", color: LIME }}>YOUR CARD IS READY</div>
            <div style={{ fontFamily: HAND, fontSize: 19, color: BUTTER, marginTop: 4, transform: "rotate(-1.5deg)" }}>Marco made you look good ✨</div>
          </div>

          <div style={{ marginTop: 22 }}>
            {look === 0 && <Polaroid photo={photo ?? ""} title={title} note={note} />}
            {look === 1 && <Receipt photo={photo ?? ""} title={title} note={note} />}
            {look === 2 && <Poster photo={photo ?? ""} title={title} note={note} />}
          </div>

          {/* edit — Marco filled these in; changes update the card live */}
          <div style={{ marginTop: 18 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="name your dish" style={{ width: "100%", background: "rgba(251,247,238,0.08)", border: "1.5px solid rgba(251,247,238,0.35)", borderRadius: 10, padding: "11px 13px", fontFamily: DISP, fontWeight: 700, fontSize: 16, color: PAPER }} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a line about it (optional)" style={{ marginTop: 8, width: "100%", background: "rgba(251,247,238,0.08)", border: "1.5px solid rgba(251,247,238,0.35)", borderRadius: 10, padding: "11px 13px", fontFamily: HAND, fontSize: 16, color: BUTTER }} />
          </div>

          {/* try another look */}
          <div className="flex items-center justify-center gap-2" style={{ marginTop: 22 }}>
            {[0, 1, 2].map((i) => (
              <button key={i} onClick={() => setLook(i)} style={{ width: look === i ? 26 : 10, height: 10, borderRadius: 99, background: look === i ? LIME : "rgba(251,247,238,0.35)", border: "none" }} aria-label={`Look ${i + 1}`} />
            ))}
          </div>
          <button onClick={() => setLook((look + 1) % 3)} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 14, background: "transparent", color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "12px 0", borderRadius: 14, border: `2px solid rgba(251,247,238,0.4)` }}>↻ try another look</button>
          <button onClick={share} disabled={posting} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 10, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: "none", boxShadow: "0 10px 24px rgba(196,238,69,0.3)", opacity: posting ? 0.6 : 1 }}>{posting ? "sharing…" : `Share to ${crew?.name ?? "your crew"} →`}</button>
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

/* ── treatments — same content, different art direction ── */
function Tape({ style }: { style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", width: 82, height: 24, background: "rgba(255,216,77,0.82)", ...style }} />;
}
function Img({ photo, h }: { photo: string; h: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photo} alt="" style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />;
}

function Polaroid({ photo, title, note }: { photo: string; title: string; note: string }) {
  return (
    <div style={{ position: "relative", background: PAPER, borderRadius: 12, padding: 14, border: `2px solid ${INK}`, transform: "rotate(-1.4deg)", boxShadow: "0 20px 44px rgba(0,0,0,0.4)" }}>
      <div className="absolute flex items-center justify-center" style={{ top: -16, right: -6, width: 58, height: 58, zIndex: 5 }}>
        <svg width="58" height="58" viewBox="0 0 64 64" aria-hidden><path d="M32 2l6 12 13-6-4 14 14 4-12 8 9 12-15-3-1 15-10-11-10 11-1-15-15 3 9-12-12-8 14-4-4-14 13 6z" fill={LIME} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" /></svg>
        <span style={{ position: "absolute", fontFamily: DISP, fontWeight: 700, fontSize: 11, color: INK, transform: "rotate(-8deg)", lineHeight: 0.9, textAlign: "center" }}>10<br />min</span>
      </div>
      <div style={{ position: "relative", transform: "rotate(1.2deg)" }}>
        <Tape style={{ top: -8, left: "50%", marginLeft: -41, transform: "rotate(-4deg)" }} />
        <div style={{ background: "#fff", padding: 8, border: `1px solid rgba(23,20,16,0.12)` }}><Img photo={photo} h={224} /></div>
      </div>
      <div style={{ padding: "14px 4px 0" }}>
        <div style={{ fontFamily: SANS, fontSize: 13, color: INK }}><b>you</b> cooked · just now</div>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, color: INK, lineHeight: 1.02, marginTop: 6 }}>{title}</div>
        <svg width="180" height="11" viewBox="0 0 180 11" fill="none" aria-hidden style={{ marginTop: 3 }}><path d="M2 7 C 28 2, 52 10, 78 6 S 132 2, 178 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
        {note && <div style={{ fontFamily: HAND, fontSize: 18, color: TOMATO, marginTop: 8, transform: "rotate(-1deg)" }}>{note}</div>}
      </div>
    </div>
  );
}

function Receipt({ photo, title, note }: { photo: string; title: string; note: string }) {
  return (
    <div style={{ position: "relative", background: "#fff", padding: "18px 18px 22px", border: `2px solid ${INK}`, transform: "rotate(1.2deg)", boxShadow: "0 20px 44px rgba(0,0,0,0.4)", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 26px, rgba(23,20,16,0.05) 27px)" }}>
      <div className="text-center" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", color: INK }}>· MARCO KITCHEN ·<br />FRESH OUT THE PAN</div>
      <div style={{ borderTop: `1.5px dashed ${INK}`, margin: "12px 0" }} />
      <div style={{ position: "relative", transform: "rotate(-1.6deg)", border: `2px solid ${INK}`, padding: 6, background: "#fff", width: "88%", margin: "0 auto" }}>
        <Img photo={photo} h={200} />
        <div style={{ position: "absolute", bottom: -12, right: -10, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "5px 12px", borderRadius: 4, transform: "rotate(7deg)", border: `2px solid ${INK}` }}>COOKED ✓</div>
      </div>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 23, color: INK, marginTop: 20, textAlign: "center", lineHeight: 1.05 }}>{title}</div>
      {note && <div style={{ fontFamily: HAND, fontSize: 17, color: COBALT, marginTop: 6, textAlign: "center" }}>“{note}”</div>}
      <div style={{ borderTop: `1.5px dashed ${INK}`, margin: "14px 0 8px" }} />
      <div className="text-center" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: INK }}>by you · thank you · come again</div>
      <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 8 }}>{Array.from({ length: 28 }).map((_, i) => <span key={i} style={{ width: i % 3 ? 2 : 4, height: 22, background: INK }} />)}</div>
    </div>
  );
}

function Poster({ photo, title, note }: { photo: string; title: string; note: string }) {
  return (
    <div style={{ position: "relative", background: COBALT, borderRadius: 12, padding: 16, border: `2.5px solid ${INK}`, transform: "rotate(-1deg)", boxShadow: "0 20px 44px rgba(0,0,0,0.45)", overflow: "hidden" }}>
      <div className="absolute" style={{ top: 10, left: 12, fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: LIME }}>NOW COOKING</div>
      <div style={{ position: "relative", transform: "rotate(2deg)", border: `4px solid ${PAPER}`, marginTop: 26, boxShadow: "0 10px 20px rgba(0,0,0,0.35)" }}>
        <Img photo={photo} h={230} />
        <div style={{ position: "absolute", top: -14, right: -12, background: PINK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 99, transform: "rotate(10deg)", border: `2px solid ${INK}` }}>hot 🔥</div>
      </div>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: PAPER, lineHeight: 1.0, marginTop: 16, textShadow: `2px 2px 0 ${PINK}` }}>{title}</div>
      {note && <div style={{ fontFamily: HAND, fontSize: 18, color: BUTTER, marginTop: 8 }}>{note}</div>}
      <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
        <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 99, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 12, border: `1.5px solid ${INK}` }}>Y</div>
        <span style={{ fontFamily: SANS, fontSize: 13, color: PAPER }}>you · just now</span>
      </div>
    </div>
  );
}
