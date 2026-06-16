"use client";

import Image from "next/image";
import GuidedShell from "./GuidedShell";

/* Guided flow — meal-planning feature showcase. A phone mockup of the weekly
   meal plan (cream/white cards, orange accents, day stack) like the real app,
   shown the same way as the welcome-screen phone. Closes the meal-planning
   mini-arc before the recipe import. */

const DAYS = [
  {
    day: "MON",
    date: "16",
    today: true,
    meal: { type: "Dinner", title: "Creamy Pork Stew", img: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg" },
  },
  {
    day: "TUE",
    date: "17",
    today: false,
    meal: { type: "Dinner", title: "Mapo Tofu", img: "/onboarding/recipes/mapo-tofu.jpg" },
  },
  {
    day: "WED",
    date: "18",
    today: false,
    meal: { type: "Lunch", title: "Chicken Shawarma", img: "/onboarding/recipes/Chicken-Shawarma-8.jpg" },
  },
  {
    day: "THU",
    date: "19",
    today: false,
    meal: { type: "Dinner", title: "Shrimp Scampi", img: "/onboarding/recipes/shrimp scampi.jpg" },
  },
] as const;

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

export default function MealPlanFeatureStep({ step, totalSteps, onBack, onContinue }: Props) {
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
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Plan your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>week</em> in seconds
        </h1>
        <p
          className="mt-3 max-w-xs mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "16px",
            lineHeight: 1.45,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Drop any recipe onto a day — we&apos;ll build the grocery list for you.
        </p>
      </div>

      {/* Phone mockup with the weekly plan */}
      <div className="flex justify-center my-8 animate-stagger-in" style={{ animationDelay: "0.18s" }}>
        <div
          className="overflow-hidden"
          style={{
            width: "212px",
            borderRadius: "30px",
            background: "#1C1A17",
            padding: "7px",
            boxShadow: "0 20px 46px -14px rgba(28,26,23,0.45)",
          }}
        >
          <div className="overflow-hidden" style={{ borderRadius: "24px", background: "#F5EEE2" }}>
            {/* App bar */}
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-1.5">
              <span className="marco-signature" style={{ fontSize: "0.95rem" }}>
                salt &amp; spoon
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "7.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-soft, #4A4742)",
                }}
              >
                Jun 16–22
              </span>
            </div>

            {/* Day stack */}
            <div className="px-3 pb-3.5 flex flex-col gap-2">
              {DAYS.map((d, i) => (
                <div
                  key={d.day}
                  className="animate-stagger-in"
                  style={{
                    background: d.today ? "rgba(229,70,46,0.06)" : "#FFFFFF",
                    border: d.today
                      ? "1px solid rgba(229,70,46,0.35)"
                      : "1px solid rgba(28,26,23,0.07)",
                    borderRadius: "12px",
                    padding: "7px 8px",
                    boxShadow: "0 1px 2px rgba(28,26,23,0.04)",
                    animationDelay: `${0.3 + i * 0.1}s`,
                  }}
                >
                  {/* Day label */}
                  <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "8px",
                        letterSpacing: "0.12em",
                        color: d.today ? "var(--tomato, #E5462E)" : "var(--ink-soft, #4A4742)",
                        fontWeight: 600,
                      }}
                    >
                      {d.day} {d.date}
                    </span>
                    {d.today && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: "6.5px",
                          letterSpacing: "0.1em",
                          color: "var(--tomato, #E5462E)",
                          background: "rgba(229,70,46,0.12)",
                          padding: "1px 4px",
                          borderRadius: "5px",
                        }}
                      >
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Meal card */}
                  <div className="flex items-center gap-2">
                    <div
                      className="relative flex-shrink-0 overflow-hidden"
                      style={{ width: "30px", height: "30px", borderRadius: "7px" }}
                    >
                      <Image
                        src={encodeURI(d.meal.img)}
                        alt={d.meal.title}
                        fill
                        sizes="30px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate"
                        style={{
                          fontFamily: "var(--font-display, Georgia, serif)",
                          fontVariationSettings: '"opsz" 14, "wght" 550',
                          fontSize: "11px",
                          color: "var(--ink, #1C1A17)",
                          lineHeight: 1.15,
                        }}
                      >
                        {d.meal.title}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: "7px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--ink-soft, #4A4742)",
                          marginTop: "1px",
                        }}
                      >
                        {d.meal.type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GuidedShell>
  );
}
