"use client";

import { useEffect, useState } from "react";

/* The welcome-screen phone. A salt & spoon recipe screen rendered live in
   code (cream / Fraunces / tomato), with an "import in seconds" reveal: the
   ingredients stagger in, then a handwritten "in seconds" sticker pops over
   the frame. The whole sequence loops so it reads as motion at a glance. */

const INGREDIENTS = [
  { emoji: "🍝", amount: "1 pack", name: "tortellini" },
  { emoji: "🍄", amount: "250 g", name: "chestnut mushrooms" },
  { emoji: "🧅", amount: "1", name: "shallot, diced" },
  { emoji: "🧄", amount: "4 cloves", name: "garlic" },
  { emoji: "🌿", amount: "1 tsp", name: "Italian herbs" },
  { emoji: "🥣", amount: "700 ml", name: "vegetable stock" },
  { emoji: "🧀", amount: "2 tbsp", name: "cream cheese" },
] as const;

// Timing of one reveal cycle.
const FIRST_DELAY = 0.35; // when the first ingredient lands
const STEP = 0.11; // gap between ingredients
const STICKER_DELAY =
  FIRST_DELAY + INGREDIENTS.length * STEP + 0.25; // after the last ingredient
const CYCLE_MS = 6200; // full loop length

export default function WelcomePhoneMockup() {
  // Remounting the screen body on each cycle replays the entrance animations.
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative mx-auto h-full"
      style={{ aspectRatio: "186 / 380", maxWidth: "100%" }}
    >
      {/* Soft glow puddle behind the phone to lift it off the cream */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "-4%",
          width: "118%",
          height: "30%",
          background:
            "radial-gradient(ellipse at center, rgba(28,26,23,0.18) 0%, rgba(28,26,23,0) 70%)",
          filter: "blur(6px)",
        }}
      />

      {/* Phone bezel */}
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          borderRadius: "40px",
          background: "#1C1A17",
          padding: "8px",
          boxShadow:
            "0 22px 50px -12px rgba(28,26,23,0.45), 0 0 0 2px rgba(28,26,23,0.9), inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* Screen */}
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ borderRadius: "33px", background: "#F5EEE2" }}
        >
          {/* Dynamic island */}
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 z-20"
            style={{
              top: "9px",
              width: "32%",
              height: "16px",
              background: "#1C1A17",
              borderRadius: "100px",
            }}
          />

          <RecipeScreen key={cycle} />
        </div>
      </div>

      {/* "in seconds" sticker — pops over the lower third of the frame */}
      <div
        key={`sticker-${cycle}`}
        className="absolute z-30"
        style={{
          left: "50%",
          bottom: "16%",
          transform: "translateX(-50%) rotate(-7deg)",
          animation: `welcome-sticker-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${STICKER_DELAY}s both`,
        }}
      >
        <span
          className="block whitespace-nowrap"
          style={{
            fontFamily: "var(--font-script, 'Caveat', cursive)",
            fontWeight: 700,
            fontSize: "clamp(20px, 6.2vw, 30px)",
            lineHeight: 1,
            color: "#F5EEE2",
            background: "var(--tomato, #E5462E)",
            padding: "8px 18px 10px",
            borderRadius: "14px",
            boxShadow: "0 8px 20px -6px rgba(229,70,46,0.6)",
          }}
        >
          in seconds
        </span>
      </div>

      <style>{`
        @keyframes welcome-sticker-pop {
          0%   { opacity: 0; transform: translateX(-50%) rotate(-7deg) scale(0.4); }
          70%  { opacity: 1; transform: translateX(-50%) rotate(-7deg) scale(1.08); }
          100% { opacity: 1; transform: translateX(-50%) rotate(-7deg) scale(1); }
        }
      `}</style>
    </div>
  );
}

function RecipeScreen() {
  return (
    <div className="flex h-full w-full flex-col" style={{ paddingTop: "34px" }}>
      {/* App bar */}
      <div className="flex items-center justify-between px-4 pb-2">
        <span
          className="marco-signature"
          style={{ fontSize: "1.05rem" }}
        >
          salt &amp; spoon
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "8px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Imported
        </span>
      </div>

      {/* Recipe title block */}
      <div
        className="px-4 pb-2.5 animate-stagger-in"
        style={{ animationDelay: "0.05s" }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "7.5px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--tomato, #E5462E)",
            marginBottom: "3px",
          }}
        >
          25 min · serves 4
        </p>
        <h3
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 40, "wght" 600',
            fontSize: "19px",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Creamy Tortellini Soup
        </h3>
      </div>

      <div
        className="mx-4"
        style={{ height: "1px", background: "rgba(28,26,23,0.1)" }}
      />

      {/* Ingredients label */}
      <p
        className="px-4 pt-2.5 pb-1 animate-stagger-in"
        style={{
          animationDelay: "0.18s",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "8px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--ink-soft, #4A4742)",
        }}
      >
        Ingredients
      </p>

      {/* Ingredient rows */}
      <div className="flex-1 overflow-hidden px-4">
        {INGREDIENTS.map((ing, i) => (
          <div
            key={ing.name}
            className="flex items-center gap-2.5 animate-stagger-in"
            style={{
              paddingTop: "6.5px",
              paddingBottom: "6.5px",
              animationDelay: `${FIRST_DELAY + i * STEP}s`,
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "22px",
                height: "22px",
                fontSize: "12px",
                background: "rgba(255,253,247,0.8)",
                borderRadius: "50%",
                boxShadow: "0 1px 2px rgba(28,26,23,0.08)",
              }}
            >
              {ing.emoji}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontVariationSettings: '"opsz" 14, "wght" 450',
                fontSize: "11.5px",
                lineHeight: 1.2,
                color: "var(--ink, #1C1A17)",
              }}
            >
              <strong style={{ fontVariationSettings: '"wght" 650' }}>
                {ing.amount}
              </strong>{" "}
              {ing.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
