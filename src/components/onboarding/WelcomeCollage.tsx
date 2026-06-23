"use client";

import TomatoMascot from "@/components/gamification/TomatoMascot";

/**
 * The welcome-screen hero collage: a scattered cluster of floating cards — a
 * recipe photo, the Marco tomato with a handwritten callout, a "save" button, a
 * streak ring, and a few drifting hearts. Sits above the big "Reach your cooking
 * goals" headline. Everything gently floats; honours prefers-reduced-motion.
 */
export default function WelcomeCollage() {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden"
      style={{ maxWidth: "440px", height: "clamp(238px, 35vh, 320px)" }}
      aria-hidden
    >
      {/* Soft warm glow behind the cluster */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "78%", height: "70%", background: "radial-gradient(ellipse at center, rgba(229,70,46,0.10) 0%, rgba(229,70,46,0) 70%)" }}
      />

      {/* Recipe photo card — bleeds off the left edge, tilted */}
      <div
        className="wc-float-a absolute"
        style={{ top: "6%", left: "-4%", transform: "rotate(-6deg)" }}
      >
        <div
          className="relative overflow-hidden"
          style={{ width: "clamp(118px, 31vw, 146px)", aspectRatio: "5 / 6", borderRadius: "22px", border: "4px solid #FFFDF7", boxShadow: "0 16px 34px -14px rgba(28,26,23,0.45)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/onboarding/recipes/fettuccine-alfredo.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        {/* Cook-time badge */}
        <div
          className="absolute flex items-center gap-1"
          style={{ bottom: "-12px", left: "10px", background: "#FFFDF7", borderRadius: "100px", padding: "5px 10px", boxShadow: "0 6px 16px -6px rgba(28,26,23,0.35)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--tomato, #E5462E)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.02em", color: "var(--ink, #1C1A17)" }}>25 min</span>
        </div>
      </div>

      {/* Drifting hearts */}
      {[
        { left: "52%", top: "10%", s: 16, d: "0s" },
        { left: "63%", top: "2%", s: 22, d: "0.6s" },
        { left: "72%", top: "16%", s: 13, d: "1.2s" },
      ].map((h, i) => (
        <svg
          key={i}
          className="wc-heart absolute"
          style={{ left: h.left, top: h.top, animationDelay: h.d }}
          width={h.s} height={h.s} viewBox="0 0 24 24" fill="var(--tomato, #E5462E)"
        >
          <path d="M12 21s-7.5-4.9-10-9.2C.3 8.6 1.6 5 5 5c2 0 3.2 1.2 4 2.3C9.8 6.2 11 5 13 5c3.4 0 4.7 3.6 3 6.8C18.5 16.1 12 21 12 21z" />
        </svg>
      ))}

      {/* Mascot in a circular frame, with a handwritten callout + arrow */}
      <div className="wc-float-b absolute" style={{ top: "12%", right: "3%" }}>
        <div
          className="flex items-center justify-center"
          style={{ width: "clamp(96px, 25vw, 120px)", height: "clamp(96px, 25vw, 120px)", borderRadius: "50%", background: "var(--cream-warm, #EFE5D2)", border: "3px solid #FFFDF7", boxShadow: "0 14px 30px -10px rgba(28,26,23,0.4)" }}
        >
          <TomatoMascot state="thriving" size={92} greeting />
        </div>
      </div>
      {/* Callout — Caveat note + curved arrow pointing to the mascot */}
      <div className="absolute" style={{ top: "47%", right: "30%", textAlign: "right" }}>
        <span style={{ fontFamily: "var(--font-script, cursive)", fontWeight: 700, fontSize: "clamp(16px, 4.6vw, 21px)", lineHeight: 1.05, color: "var(--ink-soft, #4A4742)", display: "block", transform: "rotate(-5deg)" }}>
          your cooking buddy
        </span>
      </div>
      <svg className="absolute" style={{ top: "30%", right: "24%", width: "44px", height: "40px" }} viewBox="0 0 44 40" fill="none">
        <path d="M4 36 C10 20, 26 10, 40 8" stroke="var(--ink-soft, #4A4742)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M40 8 l-8 1 M40 8 l-3 7" stroke="var(--ink-soft, #4A4742)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>

      {/* Frosted "save recipe" button */}
      <div
        className="wc-float-c absolute flex items-center justify-center"
        style={{ bottom: "20%", left: "9%", width: "58px", height: "58px", borderRadius: "50%", background: "rgba(255,253,247,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 10px 24px -8px rgba(28,26,23,0.3)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--tomato, #E5462E)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          <path d="M12 8v5M9.5 10.5h5" stroke="var(--tomato, #E5462E)" />
        </svg>
      </div>

      {/* Streak ring widget */}
      <div
        className="wc-float-a absolute flex items-center gap-2"
        style={{ bottom: "6%", right: "7%", background: "#FFFDF7", borderRadius: "100px", padding: "7px 13px 7px 7px", boxShadow: "0 12px 26px -10px rgba(28,26,23,0.35)" }}
      >
        <div className="relative flex items-center justify-center" style={{ width: "34px", height: "34px" }}>
          <svg width="34" height="34" viewBox="0 0 34 34" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(229,70,46,0.18)" strokeWidth="4" />
            <circle cx="17" cy="17" r="14" fill="none" stroke="var(--tomato, #E5462E)" strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset="18" />
          </svg>
          <span className="absolute" style={{ fontSize: "13px", lineHeight: 1 }}>🔥</span>
        </div>
        <div style={{ lineHeight: 1 }}>
          <span style={{ display: "block", fontFamily: "var(--font-display, serif)", fontVariationSettings: '"wght" 700', fontSize: "15px", color: "var(--ink, #1C1A17)" }}>5 days</span>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "7.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft, #4A4742)" }}>cooking streak</span>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .wc-float-a { animation: wc-float-a 4.5s ease-in-out infinite; }
          .wc-float-b { animation: wc-float-b 5.2s ease-in-out infinite; }
          .wc-float-c { animation: wc-float-c 4s ease-in-out infinite; }
          .wc-heart   { animation: wc-heart 3.4s ease-in-out infinite; }
        }
        @keyframes wc-float-a { 0%,100%{transform:translateY(0) rotate(-6deg)} 50%{transform:translateY(-8px) rotate(-6deg)} }
        @keyframes wc-float-b { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
        @keyframes wc-float-c { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes wc-heart   { 0%,100%{transform:translateY(0) scale(1); opacity:0.85} 50%{transform:translateY(-10px) scale(1.08); opacity:1} }
      `}</style>
    </div>
  );
}
