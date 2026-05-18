"use client";

// Cookbook visual-language pilot — v3, "Build My Recipe Book" framing.
//
// Changes vs v2:
//  - Cover reframed as "Build My Recipe Book" (the BOOK title), with
//    Salt & Spoon demoted to a humble publisher's imprint at the top.
//    The user is the author. Ownership = retention.
//  - Dropped "Chapter One" label — cookbooks don't use chapter framing.
//    Just the metadata strip carries position information.
//  - Added a food-photo polaroid in the lower-right of the step page,
//    rotated, with a washi-tape strip — classic scrapbook cookbook feel.
//    Reuses existing /public/onboarding/recipes/ imagery.
//  - Margin note moved out of the way of the option cards.
//
// Open at /cookbook-pilot.

import Image from "next/image";
import { useState } from "react";

type PageIndex = 0 | 1;

export default function CookbookPilotPage() {
  const [page, setPage] = useState<PageIndex>(0);
  const [flipping, setFlipping] = useState<"forward" | "back" | null>(null);

  function turnForward() {
    if (flipping || page === 1) return;
    setFlipping("forward");
    window.setTimeout(() => setPage(1), 350);
    window.setTimeout(() => setFlipping(null), 700);
  }

  function turnBack() {
    if (flipping || page === 0) return;
    setFlipping("back");
    window.setTimeout(() => setPage(0), 350);
    window.setTimeout(() => setFlipping(null), 700);
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at center, #D9C9A8 0%, #B89E70 100%)",
      }}
    >
      <PaperTextureFilters />

      <div
        className="relative w-full h-full max-w-md mx-auto"
        style={{ perspective: "1800px" }}
      >
        <PageStackEdge />

        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
            transition: "transform 700ms cubic-bezier(0.7, 0, 0.3, 1)",
            transform:
              flipping === "forward"
                ? "rotateY(-180deg)"
                : flipping === "back"
                  ? "rotateY(180deg)"
                  : "rotateY(0deg)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: "hidden" }}
          >
            {page === 0 ? <CoverPage onOpen={turnForward} /> : <SampleStepPage onBack={turnBack} />}
          </div>

          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background:
                "linear-gradient(to right, #E8DCC2 0%, #F2E8D2 30%, #F5EEE2 60%)",
              filter: "url(#paper-grain)",
            }}
          />
        </div>

        {flipping && (
          <div
            className="absolute inset-y-0 left-0 pointer-events-none z-10"
            style={{
              width: "70%",
              background:
                "linear-gradient(to right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 100%)",
              animation: "fold-shadow 700ms ease-out forwards",
            }}
          />
        )}
      </div>

      <style jsx global>{`
        @keyframes fold-shadow {
          0% { opacity: 0; }
          50% { opacity: 0.7; }
          100% { opacity: 0; }
        }
        @keyframes draw-stroke {
          to { stroke-dashoffset: 0; }
        }
        @keyframes ribbon-swing {
          0% { transform: translateY(-8px) rotate(-2deg); opacity: 0; }
          60% { transform: translateY(2px) rotate(1deg); opacity: 1; }
          100% { transform: translateY(0) rotate(0deg); opacity: 1; }
        }
        @keyframes ink-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drop-cap-in {
          from { opacity: 0; transform: scale(0.7) rotate(-4deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes polaroid-place {
          from { opacity: 0; transform: rotate(2deg) translateY(20px) scale(0.96); }
          to { opacity: 1; transform: rotate(4.5deg) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Cover page — Grandma's-Kitchen image hero + "Build My Recipe Book" ─── */

function CoverPage({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center px-6 pt-8 pb-7"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #F7EFD8 0%, #ECDFC2 75%, #E0CFA8 100%)",
        boxShadow:
          "inset 18px 0 24px -10px rgba(74, 50, 20, 0.18), inset 0 0 60px rgba(120, 85, 40, 0.08)",
        filter: "url(#paper-grain)",
      }}
    >
      <CornerFrame />

      {/* Imprint */}
      <div className="flex-shrink-0" style={{ animation: "ink-fade-in 0.6s ease-out 0.15s both" }}>
        <span
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: "8.5px",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "rgba(28, 26, 23, 0.45)",
          }}
        >
          A Salt &amp; Spoon Cookbook · Vol. I
        </span>
      </div>

      {/* The hero image — a real handwritten recipe page, tilted slightly
          and shadowed like a piece of paper laid on the cover. This is
          what the user's cookbook can FEEL like — shown before they begin
          so the goal is concrete from minute one. */}
      <div
        className="relative flex-1 flex items-center justify-center w-full my-4 min-h-0"
        style={{ animation: "ink-fade-in 0.8s ease-out 0.3s both" }}
      >
        <div
          className="relative h-full"
          style={{
            aspectRatio: "3 / 4",
            maxHeight: "100%",
            maxWidth: "100%",
            transform: "rotate(-1.2deg)",
            boxShadow:
              "0 8px 24px rgba(74, 50, 20, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12)",
            background: "#F5EEDC",
          }}
        >
          <Image
            src="/marketing/image-1779076119535.jpg"
            alt="A handwritten recipe page in a personal cookbook — Grandma's Kitchen, Tomato Basil Pasta"
            fill
            sizes="(max-width: 768px) 90vw, 400px"
            style={{ objectFit: "cover" }}
            priority
          />
          {/* Subtle washi-tape strip at top-right, like the page is pasted in */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: -10,
              right: 20,
              width: 70,
              height: 18,
              background:
                "repeating-linear-gradient(45deg, rgba(232, 163, 61, 0.55) 0 4px, rgba(232, 163, 61, 0.35) 4px 8px)",
              transform: "rotate(8deg)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          />
        </div>
      </div>

      {/* Title block — "Build My Recipe Book" + tagline */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ animation: "ink-fade-in 0.7s ease-out 0.55s both" }}>
        <HandUnderline width={120} />
        <h1
          className="text-center mt-4"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 144, "wght" 700',
            fontSize: "clamp(2rem, 7.5vw, 2.6rem)",
            lineHeight: 0.98,
            letterSpacing: "-0.025em",
            color: "#1C1A17",
          }}
        >
          Build My{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>Recipe</em> Book
        </h1>
        <p
          className="italic text-center mt-3"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 14, "wght" 400',
            fontSize: "14px",
            color: "rgba(28, 26, 23, 0.62)",
            lineHeight: 1.4,
          }}
        >
          one of these, but yours.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onOpen}
        className="flex flex-col items-center gap-2 group mt-4 flex-shrink-0"
        style={{ animation: "ink-fade-in 0.6s ease-out 0.85s both" }}
      >
        <span
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "wght" 400',
            fontSize: "16px",
            color: "#1C1A17",
          }}
          className="group-active:opacity-60"
        >
          build my book
        </span>
        <DrawnArrow />
      </button>
    </div>
  );
}

/* ── Sample step page ───────────────────────────────────────────────────── */

function SampleStepPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<number | null>(0);

  const options = [
    { label: "To save the recipes I actually want to cook", icon: <HeartIcon /> },
    { label: "To plan meals without thinking too hard", icon: <CalendarIcon /> },
    { label: "To cook better with what I already have", icon: <PotIcon /> },
    { label: "To eat well with the people I love", icon: <TableIcon /> },
  ];

  return (
    <div
      className="absolute inset-0 flex flex-col px-7 pt-10 pb-6 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #F7EFD8 0%, #EFE5C8 70%, #E5D5B0 100%)",
        boxShadow:
          "inset 18px 0 24px -10px rgba(74, 50, 20, 0.18), inset 0 0 60px rgba(120, 85, 40, 0.08)",
        filter: "url(#paper-grain)",
      }}
    >
      <Ribbon />

      {/* Header row: back + metadata strip (no "Chapter") */}
      <div className="flex items-center justify-between mb-4" style={{ animation: "ink-fade-in 0.5s ease-out 0.1s both" }}>
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center active:opacity-60"
          style={{ color: "#1C1A17" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 21 12 L 5 12" />
            <path d="M 11 18 Q 5 15, 5 12 Q 5 9, 11 6" />
          </svg>
        </button>
        <div
          className="flex items-center gap-3"
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: "9px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(28, 26, 23, 0.55)",
          }}
        >
          <span>Welcome</span>
          <Dot />
          <span>4 Questions</span>
          <Dot />
          <span>~3 Min</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Page title with drop cap */}
      <div className="mb-2 mt-3" style={{ animation: "ink-fade-in 0.6s ease-out 0.3s both" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "wght" 600',
            fontSize: "30px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#1C1A17",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontVariationSettings: '"opsz" 144, "wght" 700',
              fontSize: "62px",
              float: "left",
              lineHeight: "0.85",
              marginRight: "8px",
              marginTop: "2px",
              color: "#E5462E",
              animation: "drop-cap-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both",
            }}
          >
            W
          </span>
          hat brings you{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>here?</em>
        </h1>
      </div>

      <p
        className="mb-3"
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontStyle: "italic",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "rgba(28, 26, 23, 0.65)",
          animation: "ink-fade-in 0.6s ease-out 0.4s both",
          clear: "both",
        }}
      >
        Pick the one closest to your spirit. There&apos;s no wrong answer.
      </p>

      <div className="mb-4" style={{ animation: "ink-fade-in 0.6s ease-out 0.55s both" }}>
        <HandUnderline width={70} />
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={opt.label}
              onClick={() => setSelected(i)}
              className="flex items-center gap-3.5 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
              style={{
                background: isSelected ? "rgba(229, 70, 46, 0.08)" : "rgba(255, 253, 247, 0.55)",
                border: isSelected ? "1.5px solid #E5462E" : "1px solid rgba(28, 26, 23, 0.14)",
                borderRadius: 12,
                animation: `ink-fade-in 0.5s ease-out ${0.65 + i * 0.07}s both`,
              }}
            >
              <span
                className="flex-shrink-0"
                style={{ color: isSelected ? "#E5462E" : "rgba(28, 26, 23, 0.7)" }}
              >
                {opt.icon}
              </span>
              <span
                className="flex-1"
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontVariationSettings: '"opsz" 14, "wght" 500',
                  fontSize: "15px",
                  lineHeight: 1.35,
                  color: "#1C1A17",
                }}
              >
                {opt.label}
              </span>
              {isSelected && (
                <span style={{ color: "#E5462E", fontSize: 20 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer pushes polaroid composition + page number to bottom */}
      <div className="flex-1" />

      {/* Dual-polaroid composition — Grandma's story continued from the cover.
          The cover showed her recipe card; this page shows HER cooking it
          and the resulting dish. Two photos layered like a scrapbook spread,
          large enough to dominate the bottom of the page like the original
          mockup — they're a *feature*, not corner decoration.
          Cook polaroid: portrait aspect, large, slight left tilt, extends
          off the left page edge for casual hand-placed feel.
          Dish polaroid: square aspect, overlapping the cook on its right
          side, more pronounced right tilt, extends off the right edge.
          The narrative loop closes: card (cover) → cook → result. */}
      <div
        className="relative h-[320px] mb-2 -mx-3"
        style={{ animation: "polaroid-place 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.95s both" }}
      >
        {/* Cook polaroid — large, behind, portrait aspect, extends off left edge */}
        <div className="absolute" style={{ bottom: 4, left: -8 }}>
          <DualPolaroid
            src="/marketing/grandma cooking when young.png"
            caption={null}
            width={210}
            aspectRatio="4 / 5"
            rotation={-3}
            tapeOffset={38}
            tapeRotation={-6}
            grayscale
          />
        </div>
        {/* Dish polaroid — overlapping in front-right, square, extends off right edge */}
        <div className="absolute" style={{ bottom: 18, right: -12 }}>
          <DualPolaroid
            src="/marketing/Tomato basil pasta.png"
            caption="tomato basil pasta ♥"
            width={195}
            aspectRatio="1 / 1"
            rotation={7}
            tapeOffset={42}
            tapeRotation={10}
          />
        </div>
      </div>

      {/* Page number */}
      <div
        className="flex items-center justify-center gap-3"
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontStyle: "italic",
          fontSize: "13px",
          color: "rgba(28, 26, 23, 0.5)",
          animation: "ink-fade-in 0.5s ease-out 1.1s both",
        }}
      >
        <SmallOrnament />
        <span>· 28 ·</span>
        <SmallOrnament />
      </div>
    </div>
  );
}

/* ── DualPolaroid — sized + rotated polaroid for the dual-photo composition.
   Supports grayscale (for vintage cook photos) and configurable tape position.
   Caption is optional — pass null for cook photos that don't need a label. */

function DualPolaroid({
  src,
  caption,
  width,
  aspectRatio = "1 / 1",
  rotation,
  tapeOffset,
  tapeRotation,
  grayscale = false,
}: {
  src: string;
  caption: string | null;
  width: number;
  aspectRatio?: string;
  rotation: number;
  tapeOffset: number;
  tapeRotation: number;
  grayscale?: boolean;
}) {
  return (
    <div
      className="relative"
      style={{
        width,
        padding: "12px 12px 24px 12px",
        background: "#FBFAF5",
        boxShadow: "0 10px 28px rgba(74, 50, 20, 0.28), 0 1px 0 rgba(0,0,0,0.04)",
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Washi tape strip */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -10,
          left: tapeOffset,
          width: 78,
          height: 20,
          background:
            "repeating-linear-gradient(45deg, rgba(232, 163, 61, 0.55) 0 4px, rgba(232, 163, 61, 0.35) 4px 8px)",
          transform: `rotate(${tapeRotation}deg)`,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />

      {/* The photo */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio, background: "#E5D5B0" }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={`${width}px`}
          style={{
            objectFit: "cover",
            filter: grayscale
              ? "grayscale(1) sepia(0.35) contrast(1.05) brightness(0.96)"
              : "saturate(0.92) contrast(1.02)",
          }}
        />
      </div>

      {/* Optional caption */}
      {caption && (
        <div
          className="text-center mt-2"
          style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 600,
            fontSize: "17px",
            color: "rgba(28, 26, 23, 0.78)",
            lineHeight: 1.1,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

/* ── Polaroid — food photo with washi tape (single, used elsewhere) ─────── */

function Polaroid({ src, caption }: { src: string; caption: string }) {
  return (
    <div
      className="relative"
      style={{
        width: 138,
        padding: "8px 8px 18px 8px",
        background: "#FBFAF5",
        boxShadow: "0 4px 14px rgba(74, 50, 20, 0.18), 0 1px 0 rgba(0,0,0,0.04)",
        transform: "rotate(4.5deg)",
      }}
    >
      {/* Washi tape strip across the top */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -8,
          left: 26,
          width: 60,
          height: 18,
          background:
            "repeating-linear-gradient(45deg, rgba(232, 163, 61, 0.55) 0 4px, rgba(232, 163, 61, 0.35) 4px 8px)",
          transform: "rotate(-6deg)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />

      {/* The photo */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "1 / 1", background: "#E5D5B0" }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="138px"
          style={{ objectFit: "cover", filter: "saturate(0.92) contrast(1.02)" }}
        />
      </div>

      {/* Handwritten caption */}
      <div
        className="text-center mt-2"
        style={{
          fontFamily: "'Caveat', cursive",
          fontWeight: 600,
          fontSize: "14px",
          color: "rgba(28, 26, 23, 0.7)",
          lineHeight: 1,
        }}
      >
        {caption}
      </div>
    </div>
  );
}

/* ── SVG illustrations & ornaments (unchanged from v2) ──────────────────── */

function PaperTextureFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
        <feColorMatrix
          values="0 0 0 0 0.92
                  0 0 0 0 0.86
                  0 0 0 0 0.74
                  0 0 0 0.05 0"
        />
        <feComposite in2="SourceGraphic" operator="in" />
        <feComposite in="SourceGraphic" operator="over" />
      </filter>
    </svg>
  );
}

function PageStackEdge() {
  return (
    <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ width: 6 }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to left, rgba(74, 50, 20, 0.25) 0%, rgba(245, 238, 226, 0) 100%)",
        }}
      />
      <div className="absolute inset-y-1 right-1" style={{ width: 1, background: "rgba(74, 50, 20, 0.18)" }} />
      <div className="absolute inset-y-2 right-2.5" style={{ width: 1, background: "rgba(74, 50, 20, 0.12)" }} />
    </div>
  );
}

function CornerFrame() {
  const stroke = "rgba(28, 26, 23, 0.35)";
  return (
    <svg
      className="absolute inset-5 pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill="none"
      stroke={stroke}
      strokeWidth="0.4"
      strokeLinecap="round"
      style={{ animation: "ink-fade-in 1s ease-out 0.6s both" }}
    >
      <path d="M 2 8 Q 2 2, 8 2 L 16 2" />
      <path d="M 84 2 Q 90 2, 92 8 L 92 16" />
      <path d="M 92 84 Q 92 92, 84 92 L 76 92" />
      <path d="M 16 92 Q 8 92, 8 84 L 8 76" />
    </svg>
  );
}

function SprigOrnament() {
  return (
    <svg width="72" height="44" viewBox="0 0 72 44" fill="none" stroke="#1C1A17" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 4 36 Q 20 32, 36 22 Q 52 12, 68 8" />
      <path d="M 16 32 Q 20 22, 26 26 Q 22 30, 16 32 Z" fill="#1C1A17" fillOpacity="0.85" />
      <path d="M 26 26 Q 30 16, 36 20 Q 32 25, 26 26 Z" fill="#1C1A17" fillOpacity="0.85" />
      <path d="M 38 20 Q 42 10, 48 14 Q 44 19, 38 20 Z" fill="#1C1A17" fillOpacity="0.85" />
      <path d="M 50 14 Q 54 4, 60 8 Q 56 13, 50 14 Z" fill="#1C1A17" fillOpacity="0.85" />
      <circle cx="68" cy="8" r="2.6" fill="#E5462E" />
    </svg>
  );
}

function DrawnArrow() {
  return (
    <svg width="46" height="22" viewBox="0 0 46 22" fill="none" stroke="#1C1A17" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 2 11 Q 16 4, 30 11 Q 36 14, 40 11"
        style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: "draw-stroke 0.9s ease-out 1.1s forwards" }}
      />
      <path
        d="M 34 6 L 42 11 L 34 16"
        style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "draw-stroke 0.4s ease-out 1.7s forwards" }}
      />
    </svg>
  );
}

function Ribbon() {
  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        top: -2,
        right: 32,
        width: 22,
        height: 64,
        background: "#E5462E",
        boxShadow: "1px 1px 2px rgba(0,0,0,0.18)",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
        animation: "ribbon-swing 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both",
      }}
    />
  );
}

function HandUnderline({ width = 100 }: { width?: number }) {
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none">
      <path
        d={`M 2 5 Q ${width * 0.25} 2, ${width * 0.5} 4 T ${width - 2} 4`}
        stroke="#1C1A17"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity={0.75}
        style={{ strokeDasharray: width * 1.2, strokeDashoffset: width * 1.2, animation: "draw-stroke 0.9s ease-out 0.7s forwards" }}
      />
    </svg>
  );
}

function Dot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 3,
        height: 3,
        borderRadius: "50%",
        background: "currentColor",
        opacity: 0.5,
      }}
    />
  );
}

function SmallOrnament() {
  return (
    <svg width="20" height="6" viewBox="0 0 20 6" fill="none" stroke="rgba(28, 26, 23, 0.4)" strokeWidth="0.8" strokeLinecap="round">
      <path d="M 2 3 Q 6 1, 10 3 Q 14 5, 18 3" />
    </svg>
  );
}

/* ── Option icons ───────────────────────────────────────────────────────── */

const iconBase = {
  width: 24,
  height: 24,
  viewBox: "0 0 26 26",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HeartIcon() {
  return (
    <svg {...iconBase}>
      <path d="M 13 22 C 4 16, 2 10, 5 6.5 C 8 3, 11 5, 13 8 C 15 5, 18 3, 21 6.5 C 24 10, 22 16, 13 22 Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconBase}>
      <rect x="4" y="6" width="18" height="16" rx="2" />
      <path d="M 4 11 L 22 11" />
      <path d="M 9 4 L 9 8" />
      <path d="M 17 4 L 17 8" />
      <circle cx="9" cy="16" r="0.8" fill="currentColor" />
      <circle cx="13" cy="16" r="0.8" fill="currentColor" />
    </svg>
  );
}

function PotIcon() {
  return (
    <svg {...iconBase}>
      <path d="M 4 11 L 22 11 L 21 21 Q 21 22, 20 22 L 6 22 Q 5 22, 5 21 Z" />
      <path d="M 2 11 L 24 11" />
      <path d="M 8 8 Q 8 6, 10 6 L 16 6 Q 18 6, 18 8" />
      <path d="M 10 4 Q 11 2, 13 3" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg {...iconBase}>
      <path d="M 3 10 L 23 10" />
      <path d="M 5 10 L 4 22" />
      <path d="M 21 10 L 22 22" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="17" cy="7" r="2" />
      <path d="M 13 7 L 13 10" />
    </svg>
  );
}
