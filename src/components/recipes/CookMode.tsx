"use client";

import { useState, useEffect, useRef } from "react";
import type { Recipe } from "@/types";

/**
 * Cook with Marco — Phase 1 spine.
 *
 * Now-playing step view: one active step centered, completed steps faded
 * above, next step previewed below. Tap-to-complete promotes the next step.
 *
 * Phase 1 deliberately omits everything else from the design spec — no
 * duration parsing into timer chips, no ingredient inlining, no Show-me
 * video loop, no Prep / Cook / Plate track grouping, no voice. Those are
 * Phase 2+ features that hang off this spine. This file is the foundation.
 *
 * Brand-mapped from the spec palette to Marco tokens (--tomato, --cream,
 * --ink, --ink-soft, etc) per the user's direction.
 */

interface Props {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

export default function CookMode({ recipe, isOpen, onClose }: Props) {
  const steps = recipe.steps ?? [];
  const totalSteps = steps.length;

  const [activeIndex, setActiveIndex] = useState(0);
  // Track which steps the user has completed. Order in the array preserves
  // the order they were checked, so the "completed above" stack reads
  // chronologically.
  const [completed, setCompleted] = useState<number[]>([]);
  const upNextRef = useRef<HTMLDivElement>(null);

  // Reset state every time the sheet opens — a fresh cook session shouldn't
  // pick up stale progress from a previous open.
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setCompleted([]);
    }
  }, [isOpen]);

  // ESC closes the overlay — keyboards happen even in cooking-mode previews
  // (until we add the dedicated kitchen UI).
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeStep = steps[activeIndex];
  const upNext = activeIndex + 1 < totalSteps ? steps[activeIndex + 1] : null;
  const isLastStep = activeIndex === totalSteps - 1;
  const isFinished = activeIndex >= totalSteps;

  function handleDone() {
    setCompleted((prev) => [...prev, activeIndex]);
    if (isLastStep) {
      // Brief moment for the user to register completion before exiting.
      setTimeout(onClose, 400);
      setActiveIndex(activeIndex + 1);
    } else {
      setActiveIndex(activeIndex + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{
        background: "var(--cream, #F5EEE2)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking ${recipe.title}`}
    >
      {/* Top bar — recipe title (mono eyebrow) + close */}
      <div className="flex items-start justify-between px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="marco-mono" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.7 }}>
            {recipe.title}
          </p>
          <p
            className="mt-1.5"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 400',
              fontSize: "20px",
              color: "var(--ink, #1C1A17)",
              lineHeight: 1.1,
            }}
          >
            {isFinished
              ? "Done."
              : `Step ${activeIndex + 1} of ${totalSteps}`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Exit cooking mode"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-colors active:scale-95"
          style={{ background: "var(--cream-warm, #EFE5D2)", color: "var(--ink-soft, #4A4742)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress dots — one per step, filled if complete or active. */}
      {totalSteps > 0 && (
        <div className="px-5 mt-4 flex flex-wrap gap-1.5">
          {steps.map((_, i) => {
            const done = completed.includes(i);
            const isActive = i === activeIndex && !isFinished;
            return (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: 8,
                  height: 8,
                  background: done || isActive ? "var(--tomato, #E5462E)" : "transparent",
                  border: done || isActive
                    ? "1px solid var(--tomato, #E5462E)"
                    : "1px solid var(--line, rgba(28,26,23,0.18))",
                }}
                aria-hidden="true"
              />
            );
          })}
        </div>
      )}

      {/* Empty state — recipe with no steps */}
      {totalSteps === 0 && (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
              fontSize: "17px",
              color: "var(--ink-soft, #4A4742)",
            }}
          >
            This recipe doesn't have any steps yet.
          </p>
        </div>
      )}

      {/* Completed steps — faded stack above the active card */}
      {totalSteps > 0 && completed.length > 0 && (
        <div className="px-5 mt-6 space-y-2">
          {completed.map((idx) => (
            <div
              key={idx}
              className="flex items-start gap-2"
              style={{ opacity: 0.4 }}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 mt-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--teal, #0F4C5C)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <p
                className="text-[13px] leading-tight line-clamp-2"
                style={{
                  color: "var(--ink-soft, #4A4742)",
                  textDecoration: "line-through",
                  textDecorationColor: "var(--tomato, #E5462E)",
                  textDecorationThickness: "1px",
                }}
              >
                {steps[idx]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Active step card — the focal point */}
      {totalSteps > 0 && !isFinished && activeStep && (
        <div className="flex-1 px-5 mt-6 overflow-y-auto">
          <div
            className="relative rounded-2xl bg-white"
            style={{
              boxShadow: "0 2px 16px rgba(20,12,5,0.08)",
              border: "1px solid var(--line, rgba(28,26,23,0.08))",
              padding: "20px 20px 22px 22px",
            }}
          >
            {/* Tomato rail down the left edge — anchors the active card */}
            <div
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-0 rounded-l-2xl"
              style={{ width: 3, background: "var(--tomato, #E5462E)" }}
            />
            <p className="marco-mono mb-3" style={{ color: "var(--tomato, #E5462E)" }}>
              Now
            </p>
            <p
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
                fontSize: "22px",
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                color: "var(--ink, #1C1A17)",
              }}
            >
              {activeStep}
            </p>
          </div>
        </div>
      )}

      {/* Up next preview — quiet, single-line peek at the upcoming step */}
      {totalSteps > 0 && !isFinished && upNext && (
        <div ref={upNextRef} className="px-5 pt-3">
          <p
            className="marco-mono mb-1.5"
            style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.6 }}
          >
            Up next
          </p>
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: "var(--cream-warm, #EFE5D2)" }}
          >
            <p
              className="text-[13px] leading-snug line-clamp-2"
              style={{ color: "var(--ink-soft, #4A4742)" }}
            >
              {upNext}
            </p>
          </div>
        </div>
      )}

      {/* Done CTA — bottom anchored, full-width tomato pill */}
      {totalSteps > 0 && !isFinished && (
        <div className="px-5 pt-4 pb-5">
          <button
            onClick={handleDone}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
            style={{ background: "var(--tomato, #E5462E)" }}
          >
            {isLastStep ? "Finish cooking" : "Mark step done"}
          </button>
        </div>
      )}

      {/* Finished state — brief celebration before auto-close */}
      {isFinished && (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <span className="marco-signature" style={{ fontSize: "3rem", color: "var(--ink, #1C1A17)" }}>
              done
            </span>
            <p
              className="mt-3"
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontStyle: "italic",
                fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
                fontSize: "17px",
                color: "var(--ink-soft, #4A4742)",
              }}
            >
              Eat well.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
