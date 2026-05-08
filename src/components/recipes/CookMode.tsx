"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Recipe, Ingredient } from "@/types";
import { parseStep, formatCountdown, classifyAllSteps, TRACK_LABELS, type StepToken, type StepTrack } from "@/lib/cook/stepParser";
import {
  isVoiceSupported,
  createVoiceController,
  parseIntent,
  speak,
  stopSpeaking,
  VOICE_HINTS,
  type VoiceController,
  type VoiceIntent,
} from "@/lib/cook/voice";

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
  // Running timers, keyed by `${stepIndex}:${tokenSlot}` so each duration
  // chip in the active step has a stable lookup. Timers persist across step
  // changes — chips from previous steps no longer render, but the dock keeps
  // the timer visible and dismissable. Cross-recipe persistence + push
  // notifications are explicitly the Phase 2 multi-timer-dock-plus task.
  type CookTimer = {
    remaining: number;
    total: number;
    finished: boolean;
    name: string;
    stepIndex: number;
    startedAt: number;
  };
  const [timers, setTimers] = useState<Map<string, CookTimer>>(new Map());
  const upNextRef = useRef<HTMLDivElement>(null);

  // Tick all running timers once per second. Decrement-from-state rather
  // than recompute-from-clock is fine for a foreground overlay; if we ever
  // need to handle backgrounded tabs accurately, switch to startedAt+total.
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

  function startTimer(key: string, seconds: number, name: string, stepIndex: number) {
    setTimers((prev) => {
      const next = new Map(prev);
      next.set(key, {
        remaining: seconds,
        total: seconds,
        finished: false,
        name,
        stepIndex,
        startedAt: Date.now(),
      });
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

  // Dock list — sort by startedAt so the order matches the user's mental
  // model ("the one I tapped first goes first"). Finished timers stay
  // visible at their position so the user can confirm and dismiss.
  const dockTimers = useMemo(() => {
    return [...timers.entries()]
      .map(([key, t]) => ({ key, ...t }))
      .sort((a, b) => a.startedAt - b.startedAt);
  }, [timers]);

  // Parse the active step once per change so the chip components are stable.
  const activeTokens = useMemo<StepToken[]>(() => {
    if (activeIndex >= totalSteps) return [];
    return parseStep(steps[activeIndex] ?? "", ingredients);
  }, [activeIndex, totalSteps, steps, ingredients]);

  // Classify every step into prep / cook / plate. Heuristic-only — cheap,
  // deterministic, run once per recipe and reuse for both the active card
  // eyebrow and the Prep · Cook · Plate summary row at the top.
  const stepTracks = useMemo<StepTrack[]>(() => classifyAllSteps(steps), [steps]);
  const activeTrack: StepTrack | null = activeIndex < totalSteps ? stepTracks[activeIndex] : null;
  const trackCounts = useMemo(() => {
    const counts: Record<StepTrack, { total: number; done: number }> = {
      prep: { total: 0, done: 0 },
      cook: { total: 0, done: 0 },
      plate: { total: 0, done: 0 },
    };
    const completedSet = new Set(completed);
    stepTracks.forEach((t, i) => {
      counts[t].total += 1;
      if (completedSet.has(i)) counts[t].done += 1;
    });
    return counts;
  }, [stepTracks, completed]);

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

  // ─── Tier 1 voice ────────────────────────────────────────────────────────
  // Per the spec: cooking-mode toggle activation, on-device intent matching,
  // no LLM call. ~6 commands for v1: next / previous / repeat / set-timer /
  // cancel-timer / how-much-{ingredient}. The mic button is the only entry —
  // explicit opt-in, mic stays open for the duration, no false activations
  // from kitchen chatter.
  const voiceSupported = useMemo(() => isVoiceSupported(), []);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [voiceNote, setVoiceNote] = useState<string>("");
  const voiceCtrlRef = useRef<VoiceController | null>(null);
  const voiceTimerCounterRef = useRef(0);

  // Stable ref to the latest intent handler. The voice controller is built
  // once per session; keeping the dispatcher in a ref means we don't have
  // to tear down and rebuild recognition every time activeIndex changes.
  const handleVoiceIntentRef = useRef<(intent: VoiceIntent) => void>(() => {});

  // Resolve a spoken ingredient phrase against the recipe's ingredient list.
  // Strips articles, lowercases, and accepts substrings — "butter" matches
  // "unsalted butter", "the eggs" matches "eggs", etc.
  const findIngredient = useCallback((spoken: string): Ingredient | null => {
    const norm = spoken.toLowerCase().replace(/^(the|a|an|some|of)\s+/i, "").trim();
    if (!norm) return null;
    // Prefer longer matches so "egg whites" beats "eggs" when both appear.
    const candidates = ingredients
      .map((ing) => ({ ing, name: ing.name.toLowerCase() }))
      .filter((c) => c.name.includes(norm) || norm.includes(c.name))
      .sort((a, b) => b.name.length - a.name.length);
    return candidates[0]?.ing ?? null;
  }, [ingredients]);

  // Define the dispatcher as a fresh closure every render — no
  // useCallback. The voice controller only ever invokes it via the ref
  // below, so a stable reference doesn't matter. Skipping memoization
  // sidesteps both exhaustive-deps and preserve-manual-memoization
  // warnings without losing any actual stability.
  function handleVoiceIntent(intent: VoiceIntent) {
    setVoiceTranscript(""); // clear preview the moment a final intent fires
    switch (intent.type) {
      case "next":
        if (activeIndex < totalSteps) {
          setVoiceNote("Next step");
          handleDone();
        }
        return;
      case "previous":
        if (activeIndex > 0) {
          setVoiceNote("Going back");
          setCompleted((prev) => prev.filter((i) => i !== activeIndex - 1));
          setActiveIndex(activeIndex - 1);
        }
        return;
      case "repeat": {
        const text = steps[activeIndex];
        if (text) {
          setVoiceNote("Reading the step");
          speak(text);
        }
        return;
      }
      case "set_timer": {
        voiceTimerCounterRef.current += 1;
        const key = `voice:${voiceTimerCounterRef.current}`;
        startTimer(key, intent.seconds, intent.label, activeIndex);
        setVoiceNote(`${intent.label} timer started`);
        speak(`Setting a ${intent.label} timer`);
        return;
      }
      case "cancel_timer": {
        // Cancel the most recently started timer — the spec calls out
        // ambiguity disambiguation for "stop the timer" with multiple, but
        // that's the Phase 2 confirmation-patterns task. v1 cancels newest.
        const newest = [...timers.entries()].sort((a, b) => b[1].startedAt - a[1].startedAt)[0];
        if (newest) {
          dismissTimer(newest[0]);
          setVoiceNote(`Cancelled ${newest[1].name}`);
          speak("Timer cancelled");
        }
        return;
      }
      case "how_much": {
        const match = findIngredient(intent.ingredient);
        if (match) {
          const parts = [match.amount, match.unit, match.name].filter(Boolean).join(" ");
          setVoiceNote(parts);
          speak(parts || `${intent.ingredient}: not in the list`);
        } else {
          setVoiceNote(`No ${intent.ingredient} in this recipe`);
          speak(`I don't see ${intent.ingredient} in this recipe`);
        }
        return;
      }
    }
  }
  // Update the ref each render (in an effect, not during render) so the
  // controller's onTranscript callback always invokes the latest dispatcher.
  useEffect(() => {
    handleVoiceIntentRef.current = handleVoiceIntent;
  });

  // Auto-clear the inline voice-note after a few seconds so the screen
  // doesn't carry "Going back" forever.
  useEffect(() => {
    if (!voiceNote) return;
    const handle = setTimeout(() => setVoiceNote(""), 3000);
    return () => clearTimeout(handle);
  }, [voiceNote]);

  // Build the controller once. Toggle drives start/stop. Cleanup on unmount.
  useEffect(() => {
    if (!voiceSupported) return;
    const ctrl = createVoiceController({
      onTranscript: (text) => {
        const intent = parseIntent(text);
        if (intent) {
          handleVoiceIntentRef.current(intent);
        } else {
          // Surface the heard phrase briefly so the user knows it tried
          // but didn't match. Helps debugging early.
          setVoiceNote(`Heard: ${text}`);
        }
      },
      onInterim: (text) => setVoiceTranscript(text),
      onError: (err) => setVoiceNote(`Mic error: ${err}`),
      onListeningChange: (listening) => {
        if (!listening) setVoiceTranscript("");
      },
    });
    voiceCtrlRef.current = ctrl;
    return () => {
      ctrl?.stop();
      stopSpeaking();
    };
  }, [voiceSupported]);

  function toggleVoice() {
    const ctrl = voiceCtrlRef.current;
    if (!ctrl) return;
    if (voiceListening) {
      ctrl.stop();
      setVoiceListening(false);
      stopSpeaking();
    } else {
      ctrl.start();
      setVoiceListening(true);
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              aria-label={voiceListening ? "Turn off voice" : "Turn on voice commands"}
              aria-pressed={voiceListening}
              className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-95"
              style={
                voiceListening
                  ? { background: "var(--tomato, #E5462E)", color: "#fff" }
                  : { background: "var(--cream-warm, #EFE5D2)", color: "var(--ink-soft, #4A4742)" }
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path strokeLinecap="round" d="M5 11a7 7 0 0014 0M12 18v3" />
              </svg>
              {voiceListening && (
                <span
                  aria-hidden="true"
                  className="absolute inline-flex rounded-full"
                  style={{
                    inset: -3,
                    border: "1.5px solid var(--tomato, #E5462E)",
                    opacity: 0.55,
                    animation: "marco-punctum-pulse 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                  }}
                />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Exit cooking mode"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-95"
            style={{ background: "var(--cream-warm, #EFE5D2)", color: "var(--ink-soft, #4A4742)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Voice listening band — visible when the mic is on. Shows the live
          transcript preview, the most recent action note, and the canonical
          hint chips so the user knows what to say. */}
      {voiceListening && (
        <div
          className="mx-5 mt-3 px-3 py-2 rounded-xl"
          style={{
            background: "var(--cream-warm, #EFE5D2)",
            border: "1px solid var(--line, rgba(28,26,23,0.10))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="marco-mono"
              style={{ color: "var(--tomato, #E5462E)", letterSpacing: "0.18em" }}
            >
              ● Listening
            </span>
            {voiceNote && (
              <span
                className="text-[12px] truncate ml-2"
                style={{
                  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                  fontStyle: "italic",
                  color: "var(--ink-soft, #4A4742)",
                  maxWidth: "60%",
                }}
              >
                {voiceNote}
              </span>
            )}
          </div>
          {voiceTranscript ? (
            <p
              className="text-[12.5px] mt-1 truncate"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: "var(--ink-soft, #4A4742)",
                opacity: 0.8,
              }}
            >
              {voiceTranscript}
            </p>
          ) : (
            <p
              className="text-[11px] mt-1 truncate"
              style={{
                color: "var(--ink-soft, #4A4742)",
                opacity: 0.65,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.04em",
              }}
            >
              try {VOICE_HINTS.join(" · ")}
            </p>
          )}
        </div>
      )}

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

      {/* Track summary — Prep · Cook · Plate with done/total counts. Mono
          tags so they read as metadata, not interactive controls. The
          current track is tinted tomato to match the active step's
          eyebrow. Tracks with zero steps are dropped to avoid empty pills. */}
      {totalSteps > 0 && (
        <div
          className="px-5 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: "10px",
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          {(["prep", "cook", "plate"] as StepTrack[]).map((t, i, arr) => {
            const c = trackCounts[t];
            if (c.total === 0) return null;
            const isCurrent = activeTrack === t;
            const isDone = c.done === c.total;
            const color = isCurrent
              ? "var(--tomato, #E5462E)"
              : isDone
                ? "var(--teal, #0F4C5C)"
                : "var(--ink-soft, #4A4742)";
            return (
              <span key={t} className="inline-flex items-center gap-2">
                <span style={{ color, opacity: isCurrent ? 1 : 0.7 }}>
                  {TRACK_LABELS[t]} <span style={{ opacity: 0.6 }}>{c.done}/{c.total}</span>
                </span>
                {i < arr.length - 1 && (
                  <span aria-hidden="true" style={{ opacity: 0.35 }}>·</span>
                )}
              </span>
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
              {activeTrack ? `Now · ${TRACK_LABELS[activeTrack]}` : "Now"}
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
                      onStart={() => startTimer(key, tok.seconds, tok.label, activeIndex)}
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

      {/* Multi-timer dock — running timers persist across step changes here.
          Hidden when no timers are active. Dismiss a timer by tapping its X. */}
      {dockTimers.length > 0 && (
        <div
          className="px-5 pt-3 pb-1"
          style={{ borderTop: "1px solid var(--line, rgba(28,26,23,0.06))" }}
        >
          <p
            className="marco-mono mb-2"
            style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.6 }}
          >
            Timers
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {dockTimers.map((t) => {
              const isFinished = t.finished;
              return (
                <div
                  key={t.key}
                  className="flex-shrink-0 inline-flex items-center gap-2 rounded-full"
                  style={{
                    padding: "6px 4px 6px 12px",
                    background: isFinished
                      ? "var(--ink-soft, #4A4742)"
                      : "var(--tomato, #E5462E)",
                    color: "#fff",
                  }}
                >
                  <span className="flex flex-col leading-tight">
                    <span
                      style={{
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        opacity: 0.85,
                      }}
                    >
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {isFinished ? "done" : formatCountdown(t.remaining)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => dismissTimer(t.key)}
                    aria-label={`Dismiss ${t.name} timer`}
                    className="w-6 h-6 flex items-center justify-center rounded-full transition-colors active:scale-90"
                    style={{ background: "rgba(255,255,255,0.18)" }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
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
