"use client";

import Image from "next/image";
import GuidedShell from "./GuidedShell";

/* Guided flow — affirmation after the goals pick. Mirrors the ReciMe
   "That's great!" screen: a reassuring stat that names the user's own
   selected goals, a blob-masked photo of someone cooking, and a warm
   sign-off. Recolored to Marco's brand. */

const GOAL_PHRASES: Record<string, string> = {
  eat_healthier: "eat healthier",
  save_money: "save money",
  cooking_skills: "improve their cooking",
  organize_recipes: "organize their recipes",
  plan_meals: "plan their meals",
  new_cuisines: "try new cuisines",
};

// Build a natural list from the selected goals, capped at three so the
// sentence stays readable.
function formatGoals(goals: string[]): string {
  const phrases = goals.map((g) => GOAL_PHRASES[g]).filter(Boolean).slice(0, 3);
  if (phrases.length === 0) return "cook with confidence";
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases[0]}, ${phrases[1]}, and ${phrases[2]}`;
}

interface Props {
  step: number;
  totalSteps: number;
  goals: string[];
  onBack?: () => void;
  onContinue: () => void;
}

export default function GoalsAffirmationStep({ step, totalSteps, goals, onBack, onContinue }: Props) {
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
      {/* Heading + dynamic stat */}
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
          That&apos;s <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>great</em>!
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
          92% of cooks say Marco has helped them{" "}
          <strong style={{ fontVariationSettings: '"wght" 600', color: "var(--ink, #1C1A17)" }}>
            {formatGoals(goals)}
          </strong>
          .
        </p>
      </div>

      {/* Blob-masked photo */}
      <div
        className="relative flex items-center justify-center my-8 animate-stagger-in"
        style={{ animationDelay: "0.18s" }}
      >
        {/* Soft tinted blob behind, slightly offset, for depth */}
        <div
          aria-hidden
          className="absolute"
          style={{
            width: "246px",
            height: "256px",
            background: "rgba(232,163,61,0.22)",
            borderRadius: "58% 42% 55% 45% / 48% 52% 48% 52%",
            transform: "translate(10px, 12px) rotate(-6deg)",
          }}
        />

        <div
          className="relative overflow-hidden"
          style={{
            width: "248px",
            height: "256px",
            borderRadius: "46% 54% 49% 51% / 56% 44% 56% 44%",
            boxShadow: "0 14px 34px -12px rgba(28,26,23,0.35)",
            border: "3px solid #FFFDF7",
          }}
        >
          <Image
            src={encodeURI("/marketing/grandma cooking when young.png")}
            alt="Someone cooking at the stove"
            fill
            sizes="248px"
            style={{ objectFit: "cover", objectPosition: "center 30%" }}
            priority
          />
        </div>
      </div>

      {/* Warm sign-off */}
      <p
        className="text-center pb-4 animate-stagger-in"
        style={{
          animationDelay: "0.28s",
          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
          fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 600',
          fontSize: "20px",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: "var(--ink, #1C1A17)",
        }}
      >
        We&apos;re here to help you
        <br />
        with your goals 🤝
      </p>
    </GuidedShell>
  );
}
