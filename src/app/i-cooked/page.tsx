"use client";

// PROTOTYPE — Marco social pivot, the signature moment: post something you cooked
// and Marco auto-art-directs a beautiful card. Capture → anticipation → reveal
// with flippable treatments (polaroid / receipt / poster). Dev-only.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postCook, getPrimaryCrew, ensureCrew, type Crew } from "@/lib/social";

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

  useEffect(() => { getPrimaryCrew().then(setCrew); }, []);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try { setPhoto(URL.createObjectURL(f)); } catch { /* ignore */ }
  }
  async function share() {
    if (posting) return;
    setPosting(true);
    const target = await ensureCrew(); // always post into a group (auto-create if none)
    await postCook({
      crewId: target?.id ?? null,
      title,
      note,
      treatment: ["polaroid", "receipt", "poster"][look],
      photoFile: file,
      photoUrl: file ? undefined : photo,
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
            <button onClick={() => fileRef.current?.click()} className="w-full active:scale-[0.99] transition-transform" style={{ marginTop: 18, height: 300, borderRadius: 14, border: `3px dashed ${INK}`, background: PAPER, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 52 }} aria-hidden>📸</span>
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>snap what you made</span>
              <span style={{ fontFamily: HAND, fontSize: 16, color: TOMATO }}>tap to add your photo</span>
            </button>
          )}

          {/* fields — empty, optional */}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="what did you make?" style={{ marginTop: 18, width: "100%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 15px", fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="anything to say? (optional)" style={{ marginTop: 10, width: "100%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 15px", fontFamily: HAND, fontSize: 17, color: TOMATO }} />

          {photo && (
            <button onClick={() => setStep("cooking")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 24, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)" }}>
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
            {look === 0 && <Polaroid photo={photo} title={title} note={note} />}
            {look === 1 && <Receipt photo={photo} title={title} note={note} />}
            {look === 2 && <Poster photo={photo} title={title} note={note} />}
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
