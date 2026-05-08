"use client";

import { useEffect, useMemo, useState } from "react";
import type { MealPlan } from "@/types";

/**
 * Cook with Marco — Phase 2, Coordination view v1.
 *
 * "Most-cooks-most-of-the-time problem: dishes that should be served together
 * don't finish together." User anchors a serve time; Marco subtracts each
 * recipe's total time (prep + cook) backward to derive a coordinated start
 * schedule. The next-action card promotes the imminent step. Live "now"
 * line moves through the timeline in real time.
 *
 * Phase 2 scope per the spec build plan:
 * - Recipe-level granularity (prep_time_minutes + cook_time_minutes). The
 *   step-parser-driven granular scheduling from Fig 2.2 of the design spec
 *   is a follow-up — many recipes have only partial step-level durations
 *   today, so recipe-level is the more honest first cut.
 * - Linear scheduler. No conflict detection ("can't sear and stir at the
 *   same moment") — that's the Phase 3 task.
 * - Push notifications when an action is imminent are also Phase 3.
 */

interface Props {
  /** Plans to coordinate. Caller passes today's plans (any meal_type) — we
   *  do not filter further so the user can decide whether to coordinate
   *  the whole day or only e.g. dinner. */
  plans: MealPlan[];
  onClose: () => void;
}

type Scheduled = {
  plan: MealPlan;
  totalMinutes: number;
  startsAtMs: number;
};

function defaultServeTime(): string {
  // Default to 7:00 PM — the median Western dinner anchor. User can edit.
  return "19:00";
}

function parseServeTimeToToday(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const d = new Date();
  d.setHours(h || 19, m || 0, 0, 0);
  return d.getTime();
}

function formatClock(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes - h * 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function relativeFromNow(ms: number, nowMs: number): string {
  const diffMin = Math.round((ms - nowMs) / 60000);
  if (diffMin <= 0) return "now";
  if (diffMin < 60) return `in ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin - h * 60;
  return m === 0 ? `in ${h} hr` : `in ${h} hr ${m} min`;
}

export default function CoordinationView({ plans, onClose }: Props) {
  const [serveTime, setServeTime] = useState<string>(defaultServeTime);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Tick every 30s so the "now" line and "in N min" copy stay fresh
  // without burning render cycles. The timeline doesn't need second-level
  // precision; the imminent-action threshold is multi-minute.
  useEffect(() => {
    const handle = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(handle);
  }, []);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const serveMs = useMemo(() => parseServeTimeToToday(serveTime), [serveTime]);

  const scheduled = useMemo<Scheduled[]>(() => {
    return plans
      .map((plan) => {
        const prep = plan.recipe?.prep_time_minutes ?? 0;
        const cook = plan.recipe?.cook_time_minutes ?? 0;
        // Floor at 10 min so a recipe with no time data still gets a
        // real timeline slot — better than 0:00 collisions.
        const totalMinutes = Math.max(10, prep + cook);
        const startsAtMs = serveMs - totalMinutes * 60_000;
        return { plan, totalMinutes, startsAtMs };
      })
      .sort((a, b) => a.startsAtMs - b.startsAtMs);
  }, [plans, serveMs]);

  // Next imminent action — first scheduled item that hasn't started yet,
  // or the earliest if everything's already past (the user is running late).
  const nextAction = useMemo<Scheduled | null>(() => {
    if (scheduled.length === 0) return null;
    const upcoming = scheduled.find((s) => s.startsAtMs >= nowMs);
    return upcoming ?? scheduled[0];
  }, [scheduled, nowMs]);

  const firstStartsAtMs = scheduled.length > 0 ? scheduled[0].startsAtMs : null;
  const minutesUntilFirst = firstStartsAtMs !== null
    ? Math.max(0, Math.round((firstStartsAtMs - nowMs) / 60000))
    : 0;

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
      aria-label="Cook coordination"
    >
      {/* Top bar */}
      <div className="flex items-start justify-between px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="marco-mono" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.7 }}>
            Coordination
          </p>
          <p
            className="mt-1.5"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 400',
              fontSize: "22px",
              color: "var(--ink, #1C1A17)",
              lineHeight: 1.15,
            }}
          >
            Serve at{" "}
            <span style={{ color: "var(--tomato, #E5462E)" }}>
              <input
                type="time"
                value={serveTime}
                onChange={(e) => setServeTime(e.target.value)}
                aria-label="Serve time"
                className="bg-transparent border-0 outline-none px-0 -mx-1"
                style={{
                  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                  fontStyle: "italic",
                  fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 400',
                  fontSize: "22px",
                  color: "var(--tomato, #E5462E)",
                  width: "5.5em",
                }}
              />
            </span>
          </p>
          <p className="mt-2 text-[12px]" style={{ color: "var(--ink-soft, #4A4742)" }}>
            {scheduled.length} dish{scheduled.length === 1 ? "" : "es"}
            {firstStartsAtMs !== null ? ` · ${minutesUntilFirst} min until first action` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close coordination"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-colors active:scale-95"
          style={{ background: "var(--cream-warm, #EFE5D2)", color: "var(--ink-soft, #4A4742)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {scheduled.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
              fontSize: "16px",
              color: "var(--ink-soft, #4A4742)",
            }}
          >
            Nothing on the plan to coordinate.
          </p>
        </div>
      ) : (
        <>
          {/* Next-action card — bigger than everything else, glanceable. */}
          {nextAction && (
            <div className="px-5 mt-5">
              <div
                className="relative rounded-2xl"
                style={{
                  background: "var(--ink, #1C1A17)",
                  color: "var(--cream, #F5EEE2)",
                  padding: "16px 18px 18px 20px",
                }}
              >
                <p
                  className="marco-mono"
                  style={{ color: "var(--mustard, #E8A33D)", letterSpacing: "0.18em" }}
                >
                  ▶ Next · {relativeFromNow(nextAction.startsAtMs, nowMs)}
                </p>
                <p
                  className="mt-2"
                  style={{
                    fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                    fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
                    fontSize: "22px",
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Start {nextAction.plan.recipe?.title ?? "this dish"}
                </p>
                <p
                  className="mt-1 text-[12.5px]"
                  style={{ color: "rgba(245,238,226,0.65)" }}
                >
                  at {formatClock(nextAction.startsAtMs)}
                  {" · "}
                  {formatDuration(nextAction.totalMinutes)} until serve
                </p>
              </div>
            </div>
          )}

          {/* Schedule timeline */}
          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-5">
            <p className="marco-mono mb-3" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.7 }}>
              Schedule
            </p>
            <div className="relative pl-4">
              {/* Rail */}
              <span
                aria-hidden="true"
                className="absolute top-1 bottom-1 left-0"
                style={{ width: 1, background: "var(--line, rgba(28,26,23,0.18))" }}
              />

              {/* "Now" marker, only visible if it falls within the schedule window. */}
              {firstStartsAtMs !== null
                && nowMs >= firstStartsAtMs - 5 * 60_000
                && nowMs <= serveMs + 10 * 60_000
                && (
                  <div
                    className="absolute -left-2 flex items-center gap-2"
                    style={{
                      top: `${nowProgressPct(scheduled, serveMs, nowMs)}%`,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <span
                      className="block rounded-full"
                      style={{ width: 10, height: 10, background: "var(--tomato, #E5462E)" }}
                    />
                  </div>
                )}

              {scheduled.map((s, i) => {
                const isPast = s.startsAtMs < nowMs;
                return (
                  <div key={i} className="flex items-start gap-3 mb-5">
                    <span
                      className="rounded-full flex-shrink-0 mt-1.5"
                      style={{
                        width: 8,
                        height: 8,
                        background: isPast ? "var(--ink-soft, #4A4742)" : "transparent",
                        border: isPast
                          ? "1px solid var(--ink-soft, #4A4742)"
                          : "1px solid var(--tomato, #E5462E)",
                        marginLeft: -4,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[11px]"
                        style={{
                          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                          color: isPast ? "var(--ink-soft, #4A4742)" : "var(--tomato, #E5462E)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {formatClock(s.startsAtMs)}
                      </p>
                      <p
                        className="mt-0.5"
                        style={{
                          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                          fontVariationSettings: '"opsz" 30, "SOFT" 100, "wght" 500',
                          fontSize: "16px",
                          color: "var(--ink, #1C1A17)",
                          opacity: isPast ? 0.55 : 1,
                          lineHeight: 1.25,
                        }}
                      >
                        Start {s.plan.recipe?.title ?? "this dish"}
                      </p>
                      <p
                        className="mt-0.5 text-[12px] capitalize"
                        style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.7 }}
                      >
                        {s.plan.meal_type} · {formatDuration(s.totalMinutes)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Serve marker — the anchor. */}
              <div className="flex items-start gap-3">
                <span
                  className="rounded-full flex-shrink-0 mt-1.5"
                  style={{
                    width: 10,
                    height: 10,
                    background: "var(--tomato, #E5462E)",
                    marginLeft: -5,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px]"
                    style={{
                      fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      color: "var(--tomato, #E5462E)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {formatClock(serveMs)}
                  </p>
                  <p
                    className="mt-0.5"
                    style={{
                      fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                      fontStyle: "italic",
                      fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
                      fontSize: "18px",
                      color: "var(--ink, #1C1A17)",
                    }}
                  >
                    Serve.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Position the "now" indicator as a percentage between the earliest scheduled
// start and the serve time. Returns 0–100 — clamps outside the window so the
// caller's range guard handles visibility.
function nowProgressPct(scheduled: Scheduled[], serveMs: number, nowMs: number): number {
  if (scheduled.length === 0) return 0;
  const start = scheduled[0].startsAtMs;
  const span = serveMs - start;
  if (span <= 0) return 0;
  const pct = ((nowMs - start) / span) * 100;
  return Math.max(0, Math.min(100, pct));
}
