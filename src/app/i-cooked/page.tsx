"use client";

// PROTOTYPE — Marco social pivot, the signature moment: post something you cooked
// and Marco auto-art-directs a beautiful card. Capture → anticipation → reveal
// with flippable treatments (polaroid / receipt / poster). Dev-only.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postCook, getPrimaryCrew, ensureCrew, extractAndSaveRecipe, type Crew } from "@/lib/social";
import CardPeek from "@/components/social/CardPeek";

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
  const [step, setStep] = useState<"capture" | "cooking" | "reveal">("capture");
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
  const [attachOpen, setAttachOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"menu" | "link" | "text">("menu");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [recipeFile, setRecipeFile] = useState<File | null>(null); // a photo of the actual recipe
  const recipeFileRef = useRef<HTMLInputElement>(null);
  const recipePromise = useRef<Promise<string | null> | null>(null);

  const hasRecipe = !!(link.trim() || text.trim() || recipeFile);
  const recipeLabel = recipeFile ? "recipe photo" : link.trim() ? "recipe link" : "recipe text";

  function pickRecipeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setRecipeFile(f); setLink(""); setText(""); setAttachOpen(false); }
  }
  function clearRecipe() { setLink(""); setText(""); setRecipeFile(null); }

  useEffect(() => { getPrimaryCrew().then(setCrew); }, []);

  // Kick off recipe extraction the moment they commit, so it's ready by "share".
  // Prefer an attached link/text (accurate); otherwise read the photo.
  function startExtraction() {
    const attached =
      link.trim() ? ({ kind: "link", url: link.trim() } as const)
      : text.trim() ? ({ kind: "text", text: text.trim() } as const)
      : recipeFile ? ({ kind: "photo", file: recipeFile } as const) // a photo of the actual recipe
      : null;
    if (attached) recipePromise.current = extractAndSaveRecipe(attached);        // accurate source wins
    else if (!recipePromise.current && file) recipePromise.current = extractAndSaveRecipe({ kind: "photo", file });
    // else: keep the recipe already read from the food photo on pick
  }

  const [reading, setReading] = useState(false); // Marco reading the dish for a prefill

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try { setPhoto(URL.createObjectURL(f)); } catch { /* ignore */ }
    readDishFromPhoto(f); // prefill title/note from the actual meal (editable)
  }

  // Read the food photo to seed the title + note (never overwrites what you've
  // typed), and keep the parsed recipe as the default one to Cook from.
  async function readDishFromPhoto(f: File) {
    setReading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/recipes/extract-image", { method: "POST", body: fd });
      if (r.ok) {
        const recipe = (await r.json()).recipe;
        if (recipe) {
          if (recipe.title) setTitle((t) => t || recipe.title);
          setNote((n) => n || captionFor(recipe));
          // save it so this dish is Cook-able by default (unless you attach a better source)
          const s = await fetch("/api/recipes/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recipe) });
          let id: string | null = null;
          if (s.ok) id = ((await s.json()).recipe?.id as string) ?? null;
          else if (s.status === 409) id = ((await s.json()).recipeId as string) ?? null;
          if (id && !recipePromise.current) recipePromise.current = Promise.resolve(id);
        }
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

  useEffect(() => {
    if (step !== "cooking") return;
    const t = setTimeout(() => { setLook(Math.floor(Math.random() * 3)); setStep("reveal"); }, 1400);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: step === "reveal" ? INK : "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      {step !== "reveal" && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />}

      {step === "capture" && (
        <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 40 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK }}>I cooked something</span>
            <button onClick={() => router.back()} aria-label="Close" style={{ fontSize: 22, color: INK, background: "none", border: "none" }}>✕</button>
          </div>
          <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 4 }}>show your people. takes 10 seconds.</div>

          {/* photo — yours only (camera or camera roll) */}
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
          {photo ? (
            <div style={{ marginTop: 18, position: "relative", transform: "rotate(-1deg)" }}>
              <div style={{ background: "#fff", padding: 10, border: `2px solid ${INK}`, boxShadow: "0 14px 32px rgba(23,20,16,0.2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }} />
              </div>
              <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: -12, right: -6, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 99, border: `2px solid ${PAPER}` }}>change photo</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full active:scale-[0.99] transition-transform" style={{ marginTop: 18, borderRadius: 14, border: `3px dashed ${INK}`, background: PAPER, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "18px 18px 20px" }}>
              <span style={{ fontFamily: HAND, fontSize: 16, color: TOMATO }}>Marco makes it look like this ✨</span>
              <div style={{ width: "100%", maxWidth: 230, pointerEvents: "none" }}><CardPeek h={128} /></div>
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK, marginTop: 4 }}>📸 snap what you made</span>
            </button>
          )}

          {/* fields — empty, optional */}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="what did you make?" style={{ marginTop: 18, width: "100%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 15px", fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="anything to say? (optional)" style={{ marginTop: 10, width: "100%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 15px", fontFamily: HAND, fontSize: 17, color: TOMATO }} />

          {/* attach recipe — one tap opens the picker sheet (link / photo / paste) */}
          <input ref={recipeFileRef} type="file" accept="image/*" onChange={pickRecipeFile} style={{ display: "none" }} />
          {hasRecipe ? (
            <div className="flex items-center gap-2" style={{ marginTop: 12, background: LIME, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 14px" }}>
              <span style={{ fontSize: 17 }} aria-hidden>📎</span>
              <span style={{ flex: 1, fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>{recipeLabel} attached ✓</span>
              <button onClick={() => { setSheetMode(recipeFile ? "menu" : link.trim() ? "link" : "text"); setAttachOpen(true); }} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK, background: "none", border: "none", textDecoration: "underline" }}>change</button>
              <button onClick={clearRecipe} aria-label="Remove" style={{ background: "none", border: "none", fontSize: 16, color: INK, opacity: 0.6 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setSheetMode("menu"); setAttachOpen(true); }} className="flex items-center gap-2" style={{ marginTop: 12, background: "none", border: "none", padding: "2px 2px" }}>
              <span style={{ border: `1.5px solid ${INK}`, borderRadius: 99, padding: "6px 12px", fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK }}>📎 add the recipe</span>
              <span style={{ fontFamily: HAND, fontSize: 14, color: TOMATO }}>more accurate than a photo alone</span>
            </button>
          )}

          {photo && (
            <button onClick={() => { startExtraction(); setStep("cooking"); }} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 20, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)" }}>
            Make my card ✨
          </button>
          )}
        </div>
      )}

      {step === "cooking" && (
        <div className="relative flex flex-col items-center justify-center" style={{ minHeight: "100dvh", textAlign: "center", padding: 30 }}>
          <div className="mk-plate" style={{ fontSize: 74 }} aria-hidden>🍅</div>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK, marginTop: 18 }}>Marco&apos;s plating your card</div>
          <div style={{ fontFamily: HAND, fontSize: 18, color: TOMATO, marginTop: 6 }}>art-directing… <span className="mk-dot">·</span><span className="mk-dot" style={{ animationDelay: ".2s" }}>·</span><span className="mk-dot" style={{ animationDelay: ".4s" }}>·</span></div>
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

      {/* attach-recipe sheet — one tap from "add the recipe", pick a source */}
      {attachOpen && (
        <div onClick={() => setAttachOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(23,20,16,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ maxWidth: 448, background: "#EDE7DA", borderTopLeftRadius: 24, borderTopRightRadius: 24, border: `2.5px solid ${INK}`, borderBottom: "none", padding: "10px 18px calc(env(safe-area-inset-bottom,0px) + 22px)" }}>
            <div style={{ width: 44, height: 5, borderRadius: 99, background: "rgba(23,20,16,0.25)", margin: "0 auto 8px" }} />
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>{sheetMode === "menu" ? "add the recipe" : sheetMode === "link" ? "paste a link" : "paste the recipe"}</span>
              <button onClick={() => setAttachOpen(false)} aria-label="Close" style={{ fontSize: 20, color: INK, background: "none", border: "none" }}>✕</button>
            </div>

            {sheetMode === "menu" && (
              <div>
                <AttachRow emoji="🔗" title="Paste a link" sub="Instagram, TikTok, any recipe site" c={COBALT} onClick={() => setSheetMode("link")} />
                <AttachRow emoji="📖" title="Photo of the recipe" sub="a cookbook page or handwritten card" c={PINK} onClick={() => recipeFileRef.current?.click()} />
                <AttachRow emoji="📝" title="Paste text" sub="copy a recipe from anywhere" c={LIME} onClick={() => setSheetMode("text")} />
                <div style={{ fontFamily: HAND, fontSize: 13.5, color: INK, opacity: 0.6, textAlign: "center", marginTop: 6 }}>skip this and Marco reads the recipe off your food photo ✨</div>
              </div>
            )}
            {sheetMode === "link" && (
              <div>
                <input autoFocus value={link} onChange={(e) => setLink(e.target.value)} placeholder="paste a recipe link…" style={{ width: "100%", background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 14px", fontFamily: SANS, fontSize: 15, color: INK }} />
                <button onClick={() => { setText(""); setRecipeFile(null); setAttachOpen(false); }} disabled={!link.trim()} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 12, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "13px 0", borderRadius: 14, border: "none", opacity: link.trim() ? 1 : 0.4 }}>attach</button>
                <button onClick={() => setSheetMode("menu")} style={{ marginTop: 8, width: "100%", background: "none", border: "none", fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7 }}>← back</button>
              </div>
            )}
            {sheetMode === "text" && (
              <div>
                <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="paste the recipe text…" rows={5} style={{ width: "100%", background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 14px", fontFamily: SANS, fontSize: 15, color: INK, resize: "none" }} />
                <button onClick={() => { setLink(""); setRecipeFile(null); setAttachOpen(false); }} disabled={!text.trim()} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 12, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "13px 0", borderRadius: 14, border: "none", opacity: text.trim() ? 1 : 0.4 }}>attach</button>
                <button onClick={() => setSheetMode("menu")} style={{ marginTop: 8, width: "100%", background: "none", border: "none", fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7 }}>← back</button>
              </div>
            )}
          </div>
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
