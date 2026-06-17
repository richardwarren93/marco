"use client";

import GuidedShell from "./GuidedShell";

/* Guided flow — reinforces that planning with salt & spoon makes the user's
   weekly cooking goal stick. A "That's great"-style screen whose hero is an
   animated line chart: cooks who plan with the app keep climbing, cooks on
   their own drift off. */

// Goal-adherence % over 8 weeks.
const WITH_APP = [42, 56, 67, 77, 84, 90, 93, 96];
const ON_OWN = [42, 38, 33, 29, 26, 24, 22, 21];

// Plot geometry (SVG user units).
const W = 320, H = 172;
const PAD_L = 8, PAD_R = 8, PAD_T = 14, PAD_B = 22;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function pts(series: number[]) {
  return series.map((v, i) => {
    const x = PAD_L + (i / (series.length - 1)) * PLOT_W;
    const y = PAD_T + (1 - v / 100) * PLOT_H;
    return [x, y] as const;
  });
}

function polyline(series: number[]) {
  return pts(series).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

export default function GoalReinforcementStep({ step, totalSteps, onBack, onContinue }: Props) {
  const withPts = pts(WITH_APP);
  const ownPts = pts(ON_OWN);
  const withEnd = withPts[withPts.length - 1];
  const ownEnd = ownPts[ownPts.length - 1];
  const baselineY = PAD_T + PLOT_H;
  // Area under the "with app" line for the soft fill.
  const areaPath = `M ${PAD_L},${baselineY} L ${withPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")} L ${(PAD_L + PLOT_W).toFixed(1)},${baselineY} Z`;

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
            fontVariationSettings: '"opsz" 72, "SOFT" 100, "wght" 600',
            fontSize: "30px",
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          We&apos;ll help you <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>stick with it</em>
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
          Cooks who plan their week with salt &amp; spoon are{" "}
          <strong style={{ fontVariationSettings: '"wght" 600', color: "var(--ink, #1C1A17)" }}>3× more likely</strong>{" "}
          to hit their cooking goal.
        </p>
      </div>

      {/* Animated chart */}
      <div
        className="mt-8 rounded-2xl p-4 animate-stagger-in"
        style={{ background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)", boxShadow: "0 8px 24px -14px rgba(28,26,23,0.25)", animationDelay: "0.18s" }}
      >
        <p
          className="mb-2"
          style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-soft, #4A4742)" }}
        >
          Sticking to your goal
        </p>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }} aria-hidden>
          <defs>
            <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--tomato, #E5462E)" stopOpacity="0.22" />
              <stop offset="1" stopColor="var(--tomato, #E5462E)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines */}
          {[0, 0.5, 1].map((g) => (
            <line key={g} x1={PAD_L} x2={PAD_L + PLOT_W} y1={PAD_T + g * PLOT_H} y2={PAD_T + g * PLOT_H} stroke="rgba(28,26,23,0.07)" strokeWidth="1" />
          ))}

          {/* area fill under the with-app line (fades in after the line draws) */}
          <path d={areaPath} fill="url(#goalFill)" style={{ opacity: 0, animation: "goal-fill-in 0.6s ease 1.3s forwards" }} />

          {/* On your own — gray, draws first */}
          <polyline
            points={polyline(ON_OWN)}
            fill="none"
            stroke="rgba(28,26,23,0.3)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "check-draw 1.1s ease-out 0.25s forwards" } as React.CSSProperties}
          />

          {/* With salt & spoon — tomato, the hero line */}
          <polyline
            points={polyline(WITH_APP)}
            fill="none"
            stroke="var(--tomato, #E5462E)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "check-draw 1.2s ease-out 0.45s forwards" } as React.CSSProperties}
          />

          {/* End dots */}
          <circle cx={ownEnd[0]} cy={ownEnd[1]} r="3.5" fill="rgba(28,26,23,0.3)" style={{ opacity: 0, animation: "goal-dot-in 0.4s ease 1.35s both" }} />
          <circle cx={withEnd[0]} cy={withEnd[1]} r="5" fill="var(--tomato, #E5462E)" style={{ opacity: 0, animation: "goal-dot-in 0.4s cubic-bezier(0.34,1.56,0.64,1) 1.55s both" }} />
        </svg>

        {/* x labels */}
        <div className="flex justify-between mt-1" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-soft, #4A4742)", opacity: 0.7 }}>
          <span>Week 1</span>
          <span>Week 8</span>
        </div>

        {/* legend */}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5" style={{ fontSize: "11.5px", color: "var(--ink, #1C1A17)", fontWeight: 600 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: "var(--tomato, #E5462E)" }} />
            With salt &amp; spoon
          </span>
          <span className="flex items-center gap-1.5" style={{ fontSize: "11.5px", color: "var(--ink-soft, #4A4742)" }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: "rgba(28,26,23,0.3)" }} />
            On your own
          </span>
        </div>
      </div>

      <style>{`
        @keyframes goal-fill-in { to { opacity: 1; } }
        @keyframes goal-dot-in { to { opacity: 1; } }
      `}</style>
    </GuidedShell>
  );
}
