"use client";

// Shared "beautiful-chaos" chrome for every opening screen (landing, sign-up,
// sign-in, password reset) so Marco's zany tone is unmistakable from the very
// first tap. Everything here is SVG + CSS: ink borders, hard offset shadows,
// washi tape, tilted food polaroids, scribbles, sticker badges and the winking
// tomato. Pages compose <AuthShell> + these primitives.

import TomatoMascot from "@/components/gamification/TomatoMascot";

export const INK = "#171410";
export const PAPER = "#FBF7EE";
export const TOMATO = "#E5462E";
export const LIME = "#C4EE45";
export const BUTTER = "#FFD84D";
export const COBALT = "#2540E8";
export const PINK = "#FF4D9D";
export const LAV = "#C9B8FF";
export const DISP = '"Marker Felt", Georgia, serif';
export const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
export const SANS = "system-ui, -apple-system, sans-serif";

export const dotted: React.CSSProperties = { background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" };

// Hard offset "sticker" shadow — the signature chaos depth cue.
export const hardShadow = (c = INK, x = 5, y = 6) => `${x}px ${y}px 0 ${c}`;

export const inkBtn: React.CSSProperties = { background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "15px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "4px 5px 0 rgba(23,20,16,0.25)" };
export const tomatoBtn: React.CSSProperties = { background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "17px 0", borderRadius: 18, border: `2.5px solid ${INK}`, boxShadow: `5px 6px 0 ${INK}` };
export const paperBtn: React.CSSProperties = { background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "14px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "3px 4px 0 rgba(23,20,16,0.22)" };
export const inputStyle: React.CSSProperties = { marginTop: 7, background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 13, padding: "13px 15px", fontFamily: SANS, fontSize: 16, color: INK, boxShadow: "3px 3px 0 rgba(23,20,16,0.12)", outline: "none" };

/* ── Little primitives ─────────────────────────────────────────────────────── */

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: size, color: INK, letterSpacing: "-0.02em" }}>
      Marco<span style={{ color: TOMATO }}>.</span>
    </span>
  );
}

export function Squiggle({ w = 150, color = TOMATO }: { w?: number; color?: string }) {
  return (
    <svg width={w} height={w * 0.073} viewBox="0 0 150 11" fill="none" aria-hidden className="block" style={{ marginTop: 3 }}>
      <path d="M2 7 C 26 2, 50 10, 76 6 S 128 2, 148 6" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// A strip of washi tape — translucent, taped-on feel.
export function Tape({ color = BUTTER, w = 120, rot = -8, style }: { color?: string; w?: number; rot?: number; style?: React.CSSProperties }) {
  return (
    <div aria-hidden style={{ position: "absolute", width: w, height: 26, background: color, opacity: 0.8, transform: `rotate(${rot}deg)`, boxShadow: "inset 0 0 0 1px rgba(23,20,16,0.08)", ...style }} />
  );
}

// A little hand-labelled food polaroid.
export function Polaroid({ src, caption, rot = -5, w = 118, captionColor = INK, style }: { src: string; caption?: string; rot?: number; w?: number; captionColor?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden style={{ position: "absolute", width: w, background: "#FFFDF7", border: `2.5px solid ${INK}`, borderRadius: 8, padding: 6, paddingBottom: caption ? 2 : 6, transform: `rotate(${rot}deg)`, boxShadow: `4px 6px 0 ${INK}`, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 4, border: `1.5px solid ${INK}`, display: "block" }} />
      {caption && <div style={{ fontFamily: HAND, fontSize: 14, color: captionColor, textAlign: "center", marginTop: 3, lineHeight: 1.1 }}>{caption}</div>}
    </div>
  );
}

// A rotated sticker/badge with ink border + hard shadow.
export function Sticker({ children, bg = LIME, rot = -4, color = INK, font = HAND, size = 14, style }: { children: React.ReactNode; bg?: string; rot?: number; color?: string; font?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <div aria-hidden style={{ position: "absolute", background: bg, color, fontFamily: font, fontWeight: 700, fontSize: size, padding: "6px 13px", borderRadius: 99, border: `2.5px solid ${INK}`, transform: `rotate(${rot}deg)`, boxShadow: `3px 4px 0 ${INK}`, whiteSpace: "nowrap", ...style }}>
      {children}
    </div>
  );
}

export function Sparkle({ size = 20, color = BUTTER, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={INK} strokeWidth={1.4} style={{ position: "absolute", ...style }}>
      <path d="M12 1 Q13.5 9 23 12 Q13.5 15 12 23 Q10.5 15 1 12 Q10.5 9 12 1 Z" />
    </svg>
  );
}

export function Heart({ size = 18, color = PINK, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={INK} strokeWidth={1.4} style={{ position: "absolute", ...style }}>
      <path d="M12 21s-7.5-4.9-10-9.2C.3 8.6 1.6 5 5 5c2 0 3.2 1.2 4 2.3C9.8 6.2 11 5 13 5c3.4 0 4.7 3.6 3 6.8C18.5 16.1 12 21 12 21z" />
    </svg>
  );
}

// Highlighter swash behind a word (wrap the word, pass as children).
export function Highlight({ children, color = LIME }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span aria-hidden style={{ position: "absolute", left: "-3%", right: "-3%", bottom: "6%", height: "42%", background: color, transform: "rotate(-1.2deg)", zIndex: 0, borderRadius: 3 }} />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
}

/* ── The shared shell: dotted bg + edge decorations + centred content ───────── */

export function AuthShell({ children, density = "frame" }: { children: React.ReactNode; density?: "frame" | "full" }) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col" style={{ ...dotted, color: INK }}>
      {/* Decorative scatter — bleeds off the four corners so the centre column
          (headline, fields, buttons) always stays clear. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* top corners */}
        <Tape color={BUTTER} w={150} rot={-11} style={{ top: 30, left: -50 }} />
        <Polaroid src="/onboarding/recipes/mapo-tofu.jpg" caption="saved ✨" rot={8} w={92} style={{ top: 26, right: -34 }} />
        <Sparkle size={18} color={BUTTER} style={{ top: 132, left: 20 }} />
        {density === "full" && <Heart size={15} color={PINK} style={{ top: 112, right: 108 }} />}

        {/* bottom corners (bleed off the bottom so they never block the CTA) */}
        <Sticker bg={LIME} rot={-7} size={12} style={{ bottom: 6, left: -26 }}>no more lost links</Sticker>
        <Polaroid src="/onboarding/recipes/Chicken-Shawarma-8.jpg" caption="yum" rot={7} w={82} style={{ bottom: -34, right: -28 }} />
        <Sparkle size={15} color={BUTTER} style={{ bottom: 92, left: 30 }} />
        {density === "full" && <Heart size={18} color={TOMATO} style={{ bottom: 150, right: 26 }} />}
      </div>

      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

// The winking tomato in a tilted card — the brand's face, for hero moments.
export function MascotCard({ size = 128, bg = LIME, rot = -4 }: { size?: number; bg?: string; rot?: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, background: bg, border: `3px solid ${INK}`, borderRadius: 32, transform: `rotate(${rot}deg)`, boxShadow: `6px 8px 0 ${INK}` }}>
      <TomatoMascot state="thriving" size={Math.round(size * 0.82)} greeting />
    </div>
  );
}
