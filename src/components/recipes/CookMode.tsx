"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Recipe } from "@/types";
import { parseStep, formatCountdown, type StepToken } from "@/lib/cook/stepParser";

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
  onClose: () => void;
}

export default function CookMode({ recipe, onClose }: Props) {
  const steps = useMemo(() => recipe.steps ?? [], [recipe.steps]);
  const totalSteps = steps.length;
  const ingredients = useMemo(() => recipe.ingredients ?? [], [recipe.ingredients]);

  const [activeIndex, setActiveIndex] = useState(0);
  // Track which steps the user has completed. Order in the array preserves
  // the order they were checked, so the "completed above" stack reads
  // chronologically.
  const [completed, setCompleted] = useState<number[]>([]);
  // Running timers, keyed by `${stepIndex}:${tokenSlot}`. Including the step
  // index in the key means switching steps naturally hides previous timers
  // from the active render without having to clear state. Cross-step
  // visibility (the dock) is its own separate task.
  const [timers, setTimers] = useState<Map<string, { remaining: number; total: number; finished: boolean }>>(new Map());
  const upNextRef = useRef<HTMLDivElement>(null);

  // Tick all running timers once per second.
  useEffect(() => {
    if (timers.size === 0) return;
    const handle = setInterval(() => {
      setTimers((prev) => {
        let mutated = false;
        const next = new Map(prev);
        for (const [key, t] of next) {
          if (t.finished) continue;
          const remaining = Math.max(0, t.remaining - 1);
          if (remaining !== t.remaining) {
            next.set(key, { ...t, remaining, finished: remaining === 0 });
            mutated = true;
          }
        }
        return mutated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(handle);
  }, [timers.size]);

  function startTimer(key: string, seconds: number) {
    setTimers((prev) => {
      const next = new Map(prev);
      next.set(key, { remaining: seconds, total: seconds, finished: false });
      return next;
    });
  }

  function dismissTimer(key: string) {
    setTimers((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  // Parse the active step once per change so the chip components are stable.
  const activeTokens = useMemo<StepToken[]>(() => {
    if (activeIndex >= totalSteps) return [];
    return parseStep(steps[activeIndex] ?? "", ingredients);
  }, [activeIndex, totalSteps, steps, ingredients]);

  // ESC closes the overlay — keyboards happen even in cooking-mode previews
  // (until we add the dedicated kitchen UI).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
            This recipe doesn&apos;t have any steps yet.
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
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
                color: "var(--ink, #1C1A17)",
              }}
            >
              {activeTokens.map((tok, i) => {
                if (tok.type === "text") {
                  return <span key={i}>{tok.content}</span>;
                }
                if (tok.type === "ingredient") {
                  // Display "[matched word][space][amount unit]" as a chip
                  // — the matched word stays in the sentence flow, the
                  // amount gets a tomato-tinted pill so the eye picks up
                  // "what / how much" at a glance.
                  const amountLabel = [tok.amount, tok.unit].filter(Boolean).join(" ").trim();
                  return (
                    <span key={i}>
                      {tok.matchedText}
                      {amountLabel ? (
                        <span
                          className="inline-flex items-baseline ml-1.5 align-baseline"
                          style={{
                            fontFamily: "var(--font-sans, 'Geist', system-ui, sans-serif)",
                            fontSize: "13px",
                            fontWeight: 600,
                            background: "var(--cream-warm, #EFE5D2)",
                            color: "var(--tomato-dark, #B8331E)",
                            padding: "1px 8px",
                            borderRadius: "999px",
                            letterSpacing: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {amountLabel}
                        </span>
                      ) : null}
                    </span>
                  );
                }
                if (tok.type === "duration") {
                  const key = `${activeIndex}:${i}`;
                  const t = timers.get(key);
                  return (
                    <DurationChip
                      key={i}
                      label={tok.label}
                      seconds={tok.seconds}
                      timer={t}
                      onStart={() => startTimer(key, tok.seconds)}
                      onDismiss={() => dismissTimer(key)}
                    />
                  );
                }
                return null;
              })}
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

// ─── DurationChip ─────────────────────────────────────────────────────────
//
// Idle state: outlined tomato pill with a clock icon and the parsed label
// ("8 min"). Tap → it flips to a live MM:SS countdown filled in tomato. At
// zero it bounces and dims to ink-soft; tapping again dismisses it back to
// idle. Per-step lifetime — the parent clears running timers on step change
// (cross-step persistence is the multi-timer dock task).

interface DurationChipProps {
  label: string;
  seconds: number;
  timer: { remaining: number; total: number; finished: boolean } | undefined;
  onStart: () => void;
  onDismiss: () => void;
}

function DurationChip({ label, timer, onStart, onDismiss }: DurationChipProps) {
  const running = !!timer && !timer.finished;
  const finished = !!timer?.finished;

  if (running && timer) {
    return (
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex items-baseline gap-1 mx-1 align-baseline transition-transform active:scale-95"
        style={{
          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.02em",
          background: "var(--tomato, #E5462E)",
          color: "#fff",
          padding: "2px 10px",
          borderRadius: "999px",
          whiteSpace: "nowrap",
        }}
        aria-label={`Stop timer (${formatCountdown(timer.remaining)} remaining)`}
      >
        {formatCountdown(timer.remaining)}
      </button>
    );
  }

  if (finished) {
    return (
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex items-baseline gap-1 mx-1 align-baseline"
        style={{
          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
          fontSize: "12px",
          fontWeight: 600,
          background: "var(--ink-soft, #4A4742)",
          color: "var(--cream, #F5EEE2)",
          padding: "2px 10px",
          borderRadius: "999px",
          whiteSpace: "nowrap",
        }}
        aria-label="Timer finished — tap to dismiss"
      >
        done · 0:00
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      className="inline-flex items-baseline gap-1 mx-1 align-baseline transition-transform active:scale-95"
      style={{
        fontFamily: "var(--font-sans, 'Geist', system-ui, sans-serif)",
        fontSize: "13px",
        fontWeight: 600,
        background: "transparent",
        color: "var(--tomato, #E5462E)",
        padding: "1px 9px",
        borderRadius: "999px",
        border: "1px solid var(--tomato, #E5462E)",
        whiteSpace: "nowrap",
      }}
      aria-label={`Start ${label} timer`}
    >
      <span aria-hidden="true" style={{ fontSize: "11px", marginRight: 1 }}>◷</span>
      {label}
    </button>
  );
}
