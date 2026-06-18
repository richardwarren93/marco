"use client";

import { useId } from "react";
import type { TomatoHealthState } from "@/lib/gamification";

/**
 * The earning mascot — a hand-painted-feeling tomato whose look reflects how
 * consistently the user earns (see deriveTomatoHealth). Pure SVG + CSS, no assets.
 * Healthy states stay faithful to the reference (eyes only, perky green calyx,
 * vibrant red, soft bounce); as he goes hungry he desaturates, droops, his eyes
 * sadden, and finally he greys out with X eyes.
 */

interface StateConfig {
  light: string;
  dark: string;
  leaf: string;
  anim: "bounce" | "sway" | "sag" | "none";
  eyes: "happy" | "open" | "droop" | "half" | "dead";
  mouth: "none" | "neutral" | "frown" | "open";
  fx: "sparkle" | "none" | "sweat";
  rx: number;
  ry: number;
  leafRot: number;
}

const CONFIG: Record<TomatoHealthState, StateConfig> = {
  thriving: { light: "#FF6B4E", dark: "#E5462E", leaf: "#5E6E38", anim: "bounce", eyes: "happy", mouth: "none", fx: "sparkle", rx: 92, ry: 80, leafRot: 0 },
  happy:    { light: "#F4593C", dark: "#D8401F", leaf: "#5E6E38", anim: "bounce", eyes: "open",  mouth: "none",    fx: "none",    rx: 92, ry: 80, leafRot: 0 },
  content:  { light: "#E9694C", dark: "#C9462C", leaf: "#63692F", anim: "sway",   eyes: "open",  mouth: "neutral", fx: "none",    rx: 93, ry: 78, leafRot: 0 },
  wilting:  { light: "#D6856B", dark: "#AE5C43", leaf: "#6E6636", anim: "sag",    eyes: "droop", mouth: "frown",   fx: "none",    rx: 95, ry: 74, leafRot: 8 },
  dying:    { light: "#C29A88", dark: "#94705C", leaf: "#7C6A44", anim: "sag",    eyes: "half",  mouth: "open",    fx: "sweat",   rx: 97, ry: 71, leafRot: 14 },
  dead:     { light: "#ABA59C", dark: "#857F76", leaf: "#8A7B5C", anim: "none",   eyes: "dead",  mouth: "none",    fx: "none",    rx: 101, ry: 66, leafRot: 22 },
};

/* Brushy calyx (the green star on top), drawn once and recoloured/drooped per state. */
function Leaf({ color, rot }: { color: string; rot: number }) {
  return (
    <g transform={`translate(120 64) rotate(${rot})`} style={{ transition: "transform 0.6s ease" }}>
      <path
        d="M0 -26 L11 -3 L36 -9 L17 9 L33 26 L4 18 L0 40 L-6 18 L-33 26 L-17 9 L-36 -9 L-11 -3 Z"
        fill={color}
      />
      <circle r="6" fill={color} />
    </g>
  );
}

function Eye({ cx, type }: { cx: number; type: StateConfig["eyes"] }) {
  const INK = "#1C1A17";
  if (type === "dead") {
    return (
      <g stroke={INK} strokeWidth={7} strokeLinecap="round">
        <line x1={cx - 9} y1={142} x2={cx + 9} y2={160} />
        <line x1={cx + 9} y1={142} x2={cx - 9} y2={160} />
      </g>
    );
  }
  if (type === "half") {
    return (
      <g>
        <ellipse cx={cx} cy={156} rx={15} ry={11} fill={INK} />
      </g>
    );
  }
  // open / happy / droop — a tall oval with a highlight; droop tilts the inner-top down.
  const tilt = type === "droop" ? (cx < 120 ? 16 : -16) : 0;
  return (
    <g transform={`rotate(${tilt} ${cx} 150)`}>
      <ellipse cx={cx} cy={150} rx={15} ry={26} fill={INK} />
      <circle cx={cx + 5} cy={140} r={5} fill="#FFFFFF" />
    </g>
  );
}

function Mouth({ type }: { type: StateConfig["mouth"] }) {
  if (type === "neutral") return <path d="M108 186 Q120 190 132 186" stroke="#7A2E22" strokeWidth={3.5} strokeLinecap="round" fill="none" />;
  if (type === "frown") return <path d="M104 191 Q120 178 136 191" stroke="#5E2317" strokeWidth={3.5} strokeLinecap="round" fill="none" />;
  if (type === "open") return <ellipse cx={120} cy={189} rx={8} ry={6.5} fill="#5E2317" />;
  return null;
}

function Sparkles() {
  return (
    <g fill="#F2B705">
      {[
        { x: 44, y: 70, s: 7, d: "0s" },
        { x: 196, y: 92, s: 9, d: "0.5s" },
        { x: 188, y: 176, s: 6, d: "1s" },
        { x: 54, y: 158, s: 5, d: "1.4s" },
      ].map((p, i) => (
        <path
          key={i}
          className="tm-twinkle"
          style={{ animationDelay: p.d, transformOrigin: `${p.x}px ${p.y}px` }}
          d={`M${p.x} ${p.y - p.s} Q${p.x + p.s * 0.25} ${p.y - p.s * 0.25} ${p.x + p.s} ${p.y} Q${p.x + p.s * 0.25} ${p.y + p.s * 0.25} ${p.x} ${p.y + p.s} Q${p.x - p.s * 0.25} ${p.y + p.s * 0.25} ${p.x - p.s} ${p.y} Q${p.x - p.s * 0.25} ${p.y - p.s * 0.25} ${p.x} ${p.y - p.s} Z`}
        />
      ))}
    </g>
  );
}

export default function TomatoMascot({ state, size = 220 }: { state: TomatoHealthState; size?: number }) {
  const c = CONFIG[state];
  const animClass = c.anim === "none" ? "" : `tm-${c.anim}`;
  const gradId = `tm-body-${useId()}`;

  return (
    <div style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 240 240" width={size} height={size} role="img">
        <defs>
          <radialGradient id={gradId} cx="0.38" cy="0.30" r="0.9">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="100%" stopColor={c.dark} />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="120" cy="214" rx={c.rx * 0.78} ry="13" fill="rgba(28,26,23,0.16)" style={{ transition: "all 0.6s ease" }} />

        {/* Character (animated as a group) */}
        <g className={animClass} style={{ transformOrigin: "120px 210px" }}>
          <Leaf color={c.leaf} rot={c.leafRot} />

          {/* Body */}
          <ellipse cx="120" cy="135" rx={c.rx} ry={c.ry} fill={`url(#${gradId})`} style={{ transition: "all 0.6s ease" }} />
          {/* Soft sheen */}
          <ellipse cx="92" cy="108" rx="24" ry="16" fill="rgba(255,255,255,0.18)" />

          <Eye cx={102} type={c.eyes} />
          <Eye cx={150} type={c.eyes} />
          <Mouth type={c.mouth} />

          {c.fx === "sweat" && (
            <path className="tm-sweat" d="M176 86 q9 13 0 20 q-9 -7 0 -20 Z" fill="#7CC4E8" style={{ transformOrigin: "176px 96px" }} />
          )}
        </g>

        {c.fx === "sparkle" && <Sparkles />}
      </svg>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .tm-bounce { animation: tm-bounce 1.8s ease-in-out infinite; }
          .tm-sway   { animation: tm-sway 3.2s ease-in-out infinite; }
          .tm-sag    { animation: tm-sag 2.6s ease-in-out infinite; }
          .tm-twinkle{ animation: tm-twinkle 1.8s ease-in-out infinite; }
          .tm-sweat  { animation: tm-twinkle 2.2s ease-in-out infinite; }
        }
        @keyframes tm-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes tm-sway   { 0%,100%{transform:rotate(-2.5deg)} 50%{transform:rotate(2.5deg)} }
        @keyframes tm-sag    { 0%,100%{transform:translateY(0) scaleY(1)} 50%{transform:translateY(2px) scaleY(0.985)} }
        @keyframes tm-twinkle{ 0%,100%{opacity:0.35; transform:scale(0.7)} 50%{opacity:1; transform:scale(1)} }
      `}</style>
    </div>
  );
}
