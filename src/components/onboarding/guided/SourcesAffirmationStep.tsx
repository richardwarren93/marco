"use client";

import Image from "next/image";
import GuidedShell from "./GuidedShell";
import { Instagram, TikTok, Facebook, Pinterest, Camera } from "./BrandIcons";

/* Guided flow — "Awesome 🎉" affirmation after the recipe-sources pick.
   Mirrors the ReciMe screen: a reassuring line that Marco imports from
   everywhere, a phone showing a social post ringed by floating app icons, and
   a "Show me how" CTA into the import step. */

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

// Floating brand badge — a rounded white tile with the glyph, gently bobbing.
function FloatBadge({
  children,
  style,
  delay,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  delay: string;
}) {
  return (
    <div
      className="absolute animate-bounce-slow"
      style={{
        width: "46px",
        height: "46px",
        borderRadius: "13px",
        background: "#FFFDF7",
        boxShadow: "0 8px 18px -6px rgba(28,26,23,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animationDelay: delay,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function SourcesAffirmationStep({ step, totalSteps, onBack, onContinue }: Props) {
  return (
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <button
          onClick={onContinue}
          className="w-full py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-colors"
          style={{ background: "var(--tomato, #E5462E)" }}
          onMouseDown={(e) => (e.currentTarget.style.background = "var(--tomato-dark, #B8331E)")}
          onMouseUp={(e) => (e.currentTarget.style.background = "var(--tomato, #E5462E)")}
        >
          Continue
        </button>
      }
    >
      {/* Heading + copy */}
      <div className="text-center pt-7 animate-stagger-in" style={{ animationDelay: "0.03s" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 72, "SOFT" 100, "wght" 600',
            fontSize: "32px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Awesome 🎉
        </h1>
        <p
          className="mt-3 max-w-sm mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "16px",
            lineHeight: 1.5,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Marco can import recipes from{" "}
          <strong style={{ fontVariationSettings: '"wght" 600', color: "var(--ink, #1C1A17)" }}>
            Instagram, TikTok, Facebook, Pinterest, YouTube
          </strong>
          , and any website.
        </p>
      </div>

      {/* Phone with floating app icons */}
      <div
        className="relative mx-auto my-8 animate-stagger-in"
        style={{ width: "260px", height: "330px", animationDelay: "0.18s" }}
      >
        {/* Floating badges around the frame */}
        <FloatBadge style={{ top: "0", right: "2px" }} delay="0s">
          <Pinterest size={28} />
        </FloatBadge>
        <FloatBadge style={{ top: "108px", right: "-10px" }} delay="0.4s">
          <Facebook size={28} />
        </FloatBadge>
        <FloatBadge style={{ bottom: "44px", right: "8px" }} delay="0.8s">
          <Instagram size={28} />
        </FloatBadge>
        <FloatBadge style={{ top: "96px", left: "-12px" }} delay="0.6s">
          <TikTok size={28} />
        </FloatBadge>
        <FloatBadge style={{ top: "8px", left: "6px" }} delay="0.2s">
          <Camera size={28} />
        </FloatBadge>

        {/* Phone */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: "12px", width: "168px" }}
        >
          <div
            className="overflow-hidden"
            style={{
              borderRadius: "26px",
              background: "#1C1A17",
              padding: "5px",
              boxShadow: "0 18px 40px -12px rgba(28,26,23,0.45)",
            }}
          >
            <div className="overflow-hidden" style={{ borderRadius: "22px", background: "#FFFDF7" }}>
              {/* Post header */}
              <div className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1.5">
                <span
                  className="flex-shrink-0"
                  style={{ width: "16px", height: "16px", borderRadius: "50%", background: "var(--tomato, #E5462E)" }}
                />
                <span
                  className="flex-1"
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "8px",
                    letterSpacing: "0.04em",
                    color: "var(--ink, #1C1A17)",
                  }}
                >
                  Marco
                </span>
                <span style={{ fontSize: "11px", color: "var(--ink-soft, #4A4742)", lineHeight: 1 }}>•••</span>
              </div>

              {/* Post image */}
              <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
                <Image
                  src="/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg"
                  alt="A braised stew recipe post"
                  fill
                  sizes="168px"
                  style={{ objectFit: "cover" }}
                />
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <Heart />
                <Comment />
                <Share />
                <span className="ml-auto">
                  <Bookmark />
                </span>
              </div>
              <p
                className="px-2.5 pb-2.5"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "7px",
                  color: "var(--ink-soft, #4A4742)",
                  lineHeight: 1.3,
                }}
              >
                Weeknight braised stew — saved in one tap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GuidedShell>
  );
}

/* Tiny post-action glyphs */
function Heart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth={2}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
function Comment() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth={2}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
    </svg>
  );
}
function Share() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
function Bookmark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
