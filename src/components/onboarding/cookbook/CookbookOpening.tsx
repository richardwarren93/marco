"use client";

// Cookbook-styled onboarding cover — step 0, shown whenever onboarding starts
// (new account or guest). The hero is the "Build My Recipe Book" cover; tapping
// "build my book" plays a page-turn and advances to the first real step (recipe
// import — the magic moment). Mid-onboarding reloads resume at the saved step
// (handled in page.tsx), so the cover only appears at the true start.

import Image from "next/image";
import { useState } from "react";
import {
  CookbookKeyframes,
  PaperTextureFilters,
  PageStackEdge,
  CornerFrame,
  DrawnArrow,
  HandUnderline,
} from "./CookbookOrnaments";

interface Props {
  onOpen: () => void;
}

export default function CookbookOpening({ onOpen }: Props) {
  const [flipping, setFlipping] = useState(false);

  function openBook() {
    if (flipping) return;
    setFlipping(true);
    // Advance once the page-turn has carried most of the way through.
    window.setTimeout(() => onOpen(), 620);
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #D9C9A8 0%, #B89E70 100%)" }}
    >
      <CookbookKeyframes />
      <PaperTextureFilters />

      <div className="relative w-full h-full max-w-md mx-auto" style={{ perspective: "1800px" }}>
        <PageStackEdge />

        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
            transition: "transform 700ms cubic-bezier(0.7, 0, 0.3, 1)",
            transform: flipping ? "rotateY(-180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front face: the cover */}
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
            <CoverPage onOpen={openBook} />
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
          A Marco Cookbook · Vol. I
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
