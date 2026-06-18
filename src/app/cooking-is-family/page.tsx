"use client";

// "Cooking is Family" — a short, auto-playing, screen-recordable marketing
// sequence built for vertical (9:16) capture. Scenes:
//   0  Hook card        "Cooking is family."
//   1  Grandma's cover  + "The family recipe is dying…"
//   2  WhatsApp chat     aunt shares a recipe → auto-saved to the family
//                        cookbook by tagging the family name  ("…until now.")
//   3  Family feed       "Every cook in your family — one cookbook."
//   4  End card          "One cookbook, written by your whole family."
// Loops. Tap anywhere to restart. DEV/marketing route — gate or remove before
// a public launch if you don't want it indexable.

import { useEffect, useState } from "react";

const TOMATO = "#E5462E";
const INK = "#1C1A17";
const INK_SOFT = "#4A4742";
const CREAM = "#F5EEE2";
const CREAM_WARM = "#EFE5D2";
const FRAUNCES = "var(--font-display, 'Fraunces', Georgia, serif)";
const MONO = "var(--font-mono, 'Geist Mono', monospace)";

const SCENES = [3000, 4000, 5200, 4800, 3600]; // ms per scene

const FEED = [
  { src: "/onboarding/recipes/lamb-biryani-83e5c3d.jpg", title: "Lamb Biryani", who: "mom", line: "made this — “sunday special”", meta: "60 MIN · DINNER" },
  { src: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg", title: "Creamy Pork Stew", who: "dad", line: "planning this for friday", meta: "45 MIN · DINNER" },
  { src: "/onboarding/recipes/chinese hamburger.jpeg", title: "Roujiamo", who: "leila", line: "saved this", meta: "30 MIN · LUNCH" },
];

/* eslint-disable @next/next/no-img-element */
function Img({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />;
}

export default function CookingIsFamilyDemo() {
  const [scene, setScene] = useState(0);
  const [run, setRun] = useState(0); // restart key

  useEffect(() => {
    const t = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), SCENES[scene]);
    return () => clearTimeout(t);
  }, [scene, run]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #D9C9A8 0%, #B89E70 100%)" }}
      onClick={() => { setScene(0); setRun((r) => r + 1); }}
    >
      {/* 9:16 stage */}
      <div className="relative overflow-hidden" style={{ width: "min(100vw, 56.25vh)", height: "min(177.78vw, 100vh)", background: CREAM }}>
        <div key={`${scene}-${run}`} className="absolute inset-0 animate-stagger-in">
          {scene === 0 && <HookCard />}
          {scene === 1 && <CoverScene />}
          {scene === 2 && <WhatsAppScene />}
          {scene === 3 && <FeedScene />}
          {scene === 4 && <EndCard />}
        </div>
      </div>
    </div>
  );
}

function HookCard() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" style={{ background: CREAM }}>
      <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(28,26,23,0.45)" }}>Marco</span>
      <h1 className="mt-4" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: "clamp(2.4rem, 9vw, 3.4rem)", lineHeight: 1.0, letterSpacing: "-0.02em", color: INK }}>
        Cooking is <em style={{ color: TOMATO, fontStyle: "italic" }}>family.</em>
      </h1>
    </div>
  );
}

function CoverScene() {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* caption */}
      <div className="flex-shrink-0 px-8 pt-[8%] text-center">
        <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: "clamp(1.1rem, 4.5vw, 1.6rem)", color: INK_SOFT, lineHeight: 1.3 }}>
          The family recipe is dying…
        </p>
      </div>
      {/* phone with grandma's cover */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-4">
        <div className="relative h-full overflow-hidden flex flex-col items-center px-5 pt-6 pb-7" style={{ aspectRatio: "9/17", maxHeight: "100%", borderRadius: 26, border: "7px solid #1C1A17", background: "radial-gradient(ellipse at 50% 40%, #F7EFD8 0%, #ECDFC2 75%, #E0CFA8 100%)", boxShadow: "0 18px 40px rgba(74,50,20,0.32)" }}>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(28,26,23,0.45)" }}>A Marco Cookbook · Vol. I</span>
          <div className="relative flex-1 my-4 w-full flex items-center justify-center min-h-0">
            <div className="relative h-full" style={{ aspectRatio: "3/4", maxHeight: "100%", transform: "rotate(-1.2deg)", boxShadow: "0 8px 24px rgba(74,50,20,0.28)", background: "#F5EEDC" }}>
              <Img src="/marketing/image-1779076119535.jpg" alt="Grandma's handwritten recipe" />
              <div className="absolute pointer-events-none" style={{ top: -8, right: 16, width: 56, height: 15, background: "repeating-linear-gradient(45deg, rgba(232,163,61,0.55) 0 4px, rgba(232,163,61,0.35) 4px 8px)", transform: "rotate(8deg)" }} />
            </div>
          </div>
          <h2 className="text-center" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 700', fontSize: "clamp(1.4rem, 6vw, 1.9rem)", lineHeight: 0.98, letterSpacing: "-0.025em", color: INK }}>
            Build My <em style={{ color: TOMATO, fontStyle: "italic" }}>Recipe</em> Book
          </h2>
          <p className="italic text-center mt-2" style={{ fontFamily: FRAUNCES, fontSize: "clamp(0.8rem, 3vw, 1rem)", color: "rgba(28,26,23,0.62)" }}>one of these, but yours.</p>
        </div>
      </div>
    </div>
  );
}

function FeedScene() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex-shrink-0 px-8 pt-[8%] text-center">
        <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: "clamp(1.1rem, 4.5vw, 1.6rem)", color: INK_SOFT, lineHeight: 1.3 }}>
          Every cook in your family — one cookbook.
        </p>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-4">
        <div className="relative h-full overflow-hidden flex flex-col px-3.5 pt-3 pb-4" style={{ aspectRatio: "9/17", maxHeight: "100%", borderRadius: 26, border: "7px solid #1C1A17", background: CREAM, boxShadow: "0 18px 40px rgba(74,50,20,0.32)" }}>
          <div className="flex-shrink-0 mb-2 px-0.5">
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,26,23,0.5)" }}>What&apos;s cooking</p>
            <h3 style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: 19, letterSpacing: "-0.02em", color: INK, marginTop: 2 }}>Extended family feed</h3>
          </div>
          <div className="space-y-2.5 flex-1 overflow-hidden">
            {FEED.map((c, i) => (
              <article key={i} className="rounded-2xl bg-white overflow-hidden animate-stagger-in" style={{ boxShadow: "0 2px 12px rgba(20,12,5,0.06)", border: "1px solid rgba(28,26,23,0.12)", animationDelay: `${i * 0.18}s` }}>
                <div className="relative w-full" style={{ aspectRatio: "16/9", background: CREAM_WARM }}><Img src={c.src} alt={c.title} /></div>
                <div className="px-3 pt-2 pb-2.5">
                  <h4 className="line-clamp-1" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 14, letterSpacing: "-0.015em", color: INK }}>{c.title}</h4>
                  <div className="mt-0.5"><span className="marco-signature" style={{ fontSize: "1rem", color: INK }}>~{c.who}</span></div>
                  <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: 11.5, color: INK_SOFT, marginTop: 1 }}>{c.line}</p>
                  <div className="mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(28,26,23,0.12)", fontFamily: MONO, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT }}>{c.meta}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppScene() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex-shrink-0 px-8 pt-[8%] text-center">
        <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: "clamp(1.1rem, 4.5vw, 1.6rem)", color: TOMATO, lineHeight: 1.3 }}>
          …until now.
        </p>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-4">
        <div className="relative h-full overflow-hidden flex flex-col" style={{ aspectRatio: "9/17", maxHeight: "100%", borderRadius: 26, border: "7px solid #1C1A17", boxShadow: "0 18px 40px rgba(74,50,20,0.32)", background: "#EFE7DE" }}>
          {/* WhatsApp header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 flex-shrink-0" style={{ background: "#008069", color: "#fff" }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 30, height: 30, background: "#cfd8d3", fontSize: 15 }}>🍲</div>
            <div className="min-w-0">
              <p style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.15 }}>Sharma Family</p>
              <p style={{ fontSize: 9.5, opacity: 0.85 }}>Mom, Dad, Aunt Meena, +3</p>
            </div>
          </div>
          {/* chat */}
          <div className="flex-1 min-h-0 overflow-hidden p-2.5 flex flex-col gap-2" style={{ background: "#EFE7DE" }}>
            <div className="self-start animate-stagger-in" style={{ maxWidth: "82%", background: "#fff", borderRadius: 10, borderTopLeftRadius: 3, padding: "5px 9px", boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#C2456B", lineHeight: 1.2 }}>Aunt Meena</p>
              <p style={{ fontSize: 12.5, color: "#111b21", lineHeight: 1.3 }}>This is THE biryani 😍 you have to make it</p>
            </div>
            <div className="self-start overflow-hidden animate-stagger-in" style={{ maxWidth: "82%", background: "#fff", borderRadius: 10, borderTopLeftRadius: 3, boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)", animationDelay: "0.35s" }}>
              <div className="relative w-full" style={{ aspectRatio: "16/9", background: CREAM_WARM }}><Img src="/onboarding/recipes/lamb-biryani-83e5c3d.jpg" alt="Lamb Biryani" /></div>
              <div style={{ padding: "5px 9px" }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: "#111b21", lineHeight: 1.25 }}>Lamb Biryani — the family recipe</p>
                <p style={{ fontSize: 10, color: "#667781" }}>instagram.com</p>
              </div>
            </div>
            <div className="self-end animate-stagger-in" style={{ maxWidth: "82%", background: "#D9FDD3", borderRadius: 10, borderTopRightRadius: 3, padding: "5px 9px", boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)", animationDelay: "0.8s" }}>
              <p style={{ fontSize: 12.5, color: "#111b21", lineHeight: 1.3 }}>Saving it 👉 <span style={{ fontWeight: 700, color: "#027eb5" }}>@Sharma Cookbook</span></p>
            </div>
            <div className="self-start animate-stagger-in" style={{ maxWidth: "90%", background: "#fff", borderRadius: 10, borderTopLeftRadius: 3, padding: "6px 9px", boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)", borderLeft: `3px solid ${TOMATO}`, animationDelay: "1.25s" }}>
              <p className="marco-signature" style={{ fontSize: 14, color: TOMATO, lineHeight: 1 }}>Marco</p>
              <p style={{ fontSize: 12.5, color: "#111b21", lineHeight: 1.3, marginTop: 2 }}>✓ Saved <b>Lamb Biryani</b> to the <b>Sharma Family Cookbook</b></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EndCard() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center" style={{ background: CREAM }}>
      <h1 style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: "clamp(1.8rem, 7vw, 2.6rem)", lineHeight: 1.1, letterSpacing: "-0.02em", color: INK }}>
        One cookbook, written by your <em style={{ color: TOMATO, fontStyle: "italic" }}>whole family.</em>
      </h1>
      <span className="marco-signature mt-8" style={{ fontSize: "1.8rem", color: INK }}>Marco</span>
    </div>
  );
}
