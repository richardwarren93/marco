"use client";

// Cookbook-styled onboarding opening — replaces the default MotivationStep
// with a two-screen sequence:
//   1. Cover: Grandma's Kitchen image as hero + "Build My Recipe Book"
//   2. Cookbook page: dual-polaroid story + the motivation question
//
// Page-turn 3D animation between them. Steps 1-9 of onboarding still use
// the default chrome — this only replaces step 0. Once the user has seen
// the cover (`marco_cookbook_opened` in localStorage), subsequent reloads
// skip directly to the cookbook page so they don't re-see the cover every
// time they reopen mid-onboarding.

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  SearchIcon,
  SaveRecipeIcon,
  MealPlanIcon,
  GroceryIcon,
} from "@/components/icons/HandDrawnIcons";

const OPENED_KEY = "marco_cookbook_opened";

const OPTIONS = [
  { id: "find_recipes", label: "Find new recipes", Icon: SearchIcon },
  { id: "save_recipes", label: "Save all my recipes in one place", Icon: SaveRecipeIcon },
  { id: "meal_plans", label: "Build meal plans easily", Icon: MealPlanIcon },
  { id: "grocery_shopping", label: "Save time grocery shopping", Icon: GroceryIcon },
];

interface Props {
  value: string | null;
  onNext: (motivation: string) => void;
}

export default function CookbookOpening({ value, onNext }: Props) {
  // Cover by default; jump straight to the cookbook page if user has
  // already opened this book in a previous session (and bailed mid-flow).
  const [phase, setPhase] = useState<"cover" | "book">("cover");
  const [flipping, setFlipping] = useState<"forward" | "back" | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(OPENED_KEY) === "1") {
        setPhase("book");
      }
    } catch {
      /* localStorage may be unavailable in some embedded contexts */
    }
  }, []);

  function openBook() {
    if (flipping || phase === "book") return;
    setFlipping("forward");
    try {
      localStorage.setItem(OPENED_KEY, "1");
    } catch {
      /* noop */
    }
    window.setTimeout(() => setPhase("book"), 350);
    window.setTimeout(() => setFlipping(null), 700);
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, #D9C9A8 0%, #B89E70 100%)",
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
          {/* Front face: whichever phase is current */}
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: "hidden" }}
          >
            {phase === "cover" ? (
              <CoverPage onOpen={openBook} />
            ) : (
              <BookPage value={value} onNext={onNext} />
            )}
          </div>

          {/* Back face: blank cream page exposed mid-fold */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "linear-gradient(to right, #E8DCC2 0%, #F2E8D2 30%, #F5EEE2 60%)",
              filter: "url(#paper-grain)",
            }}
          />
        </div>

        {/* Fold shadow during the turn */}
        {flipping && (
          <div
            className="absolute inset-y-0 left-0 pointer-events-none z-10"
            style={{
              width: "70%",
              background: "linear-gradient(to right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 100%)",
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
        @keyframes cookbook-draw-stroke {
          to { stroke-dashoffset: 0; }
        }
        @keyframes cookbook-ribbon-swing {
          0% { transform: translateY(-8px) rotate(-2deg); opacity: 0; }
          60% { transform: translateY(2px) rotate(1deg); opacity: 1; }
          100% { transform: translateY(0) rotate(0deg); opacity: 1; }
        }
        @keyframes cookbook-ink-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cookbook-drop-cap-in {
          from { opacity: 0; transform: scale(0.7) rotate(-4deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes cookbook-polaroid-place {
          from { opacity: 0; transform: rotate(2deg) translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Cover page ─────────────────────────────────────────────────────────── */

function CoverPage({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center px-6 pt-8 pb-7"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #F7EFD8 0%, #ECDFC2 75%, #E0CFA8 100%)",
        boxShadow: "inset 18px 0 24px -10px rgba(74, 50, 20, 0.18), inset 0 0 60px rgba(120, 85, 40, 0.08)",
        filter: "url(#paper-grain)",
      }}
    >
      <CornerFrame />

      <div className="flex-shrink-0" style={{ animation: "cookbook-ink-fade-in 0.6s ease-out 0.15s both" }}>
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

      <div
        className="relative flex-1 flex items-center justify-center w-full my-4 min-h-0"
        style={{ animation: "cookbook-ink-fade-in 0.8s ease-out 0.3s both" }}
      >
        <div
          className="relative h-full"
          style={{
            aspectRatio: "3 / 4",
            maxHeight: "100%",
            maxWidth: "100%",
            transform: "rotate(-1.2deg)",
            boxShadow: "0 8px 24px rgba(74, 50, 20, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12)",
            background: "#F5EEDC",
          }}
        >
          <Image
            src="/marketing/image-1779076119535.jpg"
            alt="A handwritten recipe page — Grandma's Kitchen, Tomato Basil Pasta"
            fill
            sizes="(max-width: 768px) 90vw, 400px"
            style={{ objectFit: "cover" }}
            priority
          />
          <div
            className="absolute pointer-events-none"
            style={{
              top: -10,
              right: 20,
              width: 70,
              height: 18,
              background: "repeating-linear-gradient(45deg, rgba(232, 163, 61, 0.55) 0 4px, rgba(232, 163, 61, 0.35) 4px 8px)",
              transform: "rotate(8deg)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center flex-shrink-0" style={{ animation: "cookbook-ink-fade-in 0.7s ease-out 0.55s both" }}>
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

      <button
        onClick={onOpen}
        className="flex flex-col items-center gap-2 group mt-4 flex-shrink-0"
        style={{ animation: "cookbook-ink-fade-in 0.6s ease-out 0.85s both" }}
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

/* ── Book page (motivation step in cookbook chrome) ─────────────────────── */

function BookPage({ value, onNext }: { value: string | null; onNext: (motivation: string) => void }) {
  const [selected, setSelected] = useState<string | null>(value);

  return (
    <div
      className="absolute inset-0 flex flex-col px-7 pt-10 pb-6 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #F7EFD8 0%, #EFE5C8 70%, #E5D5B0 100%)",
        boxShadow: "inset 18px 0 24px -10px rgba(74, 50, 20, 0.18), inset 0 0 60px rgba(120, 85, 40, 0.08)",
        filter: "url(#paper-grain)",
      }}
    >
      <Ribbon />

      {/* Header row: metadata strip (no back button — cover is one-way) */}
      <div
        className="flex items-center justify-center mb-4"
        style={{ animation: "cookbook-ink-fade-in 0.5s ease-out 0.1s both" }}
      >
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
          <span>Question 1</span>
          <Dot />
          <span>~3 Min</span>
        </div>
      </div>

      {/* Title with drop cap */}
      <div className="mb-2 mt-3" style={{ animation: "cookbook-ink-fade-in 0.6s ease-out 0.3s both" }}>
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
              animation: "cookbook-drop-cap-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both",
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
          animation: "cookbook-ink-fade-in 0.6s ease-out 0.4s both",
          clear: "both",
        }}
      >
        This helps us personalize your experience.
      </p>

      <div className="mb-3" style={{ animation: "cookbook-ink-fade-in 0.6s ease-out 0.55s both" }}>
        <HandUnderline width={70} />
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((opt, i) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className="flex items-center gap-3.5 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
              style={{
                background: isSelected ? "rgba(229, 70, 46, 0.08)" : "rgba(255, 253, 247, 0.55)",
                border: isSelected ? "1.5px solid #E5462E" : "1px solid rgba(28, 26, 23, 0.14)",
                borderRadius: 12,
                animation: `cookbook-ink-fade-in 0.5s ease-out ${0.65 + i * 0.07}s both`,
              }}
            >
              <span
                className="flex-shrink-0"
                style={{ color: isSelected ? "#E5462E" : "rgba(28, 26, 23, 0.7)" }}
              >
                <opt.Icon className="w-6 h-6" />
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
              {isSelected && <span style={{ color: "#E5462E", fontSize: 20 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Dual-polaroid composition — Grandma's story continues from the cover.
          Cook + dish photos layered like a scrapbook spread. Both in vintage
          B&W treatment — the whole spread reads as one coherent memory. */}
      <div
        className="relative h-[320px] mb-2 -mx-3 flex-shrink-0 mt-auto"
        style={{ animation: "cookbook-polaroid-place 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.95s both" }}
      >
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

      {/* Continue button — only enabled once an option is picked. Lives
          below the polaroids; the user has to scroll past them or just
          tap an option (the page is short enough that all options + the
          continue button fit on most modern phones). */}
      <button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="w-full py-3.5 px-4 text-white rounded-2xl disabled:opacity-40 font-semibold text-sm shadow-sm transition-colors mt-3 flex-shrink-0"
        style={{
          background: selected ? "#1C1A17" : "rgba(28, 26, 23, 0.35)",
          animation: "cookbook-ink-fade-in 0.5s ease-out 1.1s both",
        }}
      >
        Continue
      </button>

      {/* Page number */}
      <div
        className="flex items-center justify-center gap-3 mt-3 flex-shrink-0"
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontStyle: "italic",
          fontSize: "13px",
          color: "rgba(28, 26, 23, 0.5)",
          animation: "cookbook-ink-fade-in 0.5s ease-out 1.2s both",
        }}
      >
        <SmallOrnament />
        <span>· 1 ·</span>
        <SmallOrnament />
      </div>
    </div>
  );
}

/* ── DualPolaroid ───────────────────────────────────────────────────────── */

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

/* ── Ornaments ──────────────────────────────────────────────────────────── */

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
          background: "linear-gradient(to left, rgba(74, 50, 20, 0.25) 0%, rgba(245, 238, 226, 0) 100%)",
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
      style={{ animation: "cookbook-ink-fade-in 1s ease-out 0.6s both" }}
    >
      <path d="M 2 8 Q 2 2, 8 2 L 16 2" />
      <path d="M 84 2 Q 90 2, 92 8 L 92 16" />
      <path d="M 92 84 Q 92 92, 84 92 L 76 92" />
      <path d="M 16 92 Q 8 92, 8 84 L 8 76" />
    </svg>
  );
}

function DrawnArrow() {
  return (
    <svg width="46" height="22" viewBox="0 0 46 22" fill="none" stroke="#1C1A17" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 2 11 Q 16 4, 30 11 Q 36 14, 40 11"
        style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: "cookbook-draw-stroke 0.9s ease-out 1.1s forwards" }}
      />
      <path
        d="M 34 6 L 42 11 L 34 16"
        style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "cookbook-draw-stroke 0.4s ease-out 1.7s forwards" }}
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
        animation: "cookbook-ribbon-swing 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both",
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
        style={{ strokeDasharray: width * 1.2, strokeDashoffset: width * 1.2, animation: "cookbook-draw-stroke 0.9s ease-out 0.7s forwards" }}
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
