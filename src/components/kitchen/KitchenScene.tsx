"use client";

// Marco's Kitchen — the game's Home surface. A cozy, evolving kitchen where the
// zones ARE the navigation (Stove→cook, Bookshelf→recipes, Fridge→plan,
// Grocery→list, Window/Herb→consistency) and the room transforms as you cook.
//
// Deliberately SVG + CSS only (the TomatoMascot pattern) — no anim libs / 3D.
// The scene is a fixed base + swappable progression layers (currently: the herb
// window, 0→3). Placeholder art is intentionally simple and 3:4 portrait so a
// hand-authored / Midjourney 3:4 image can replace it with no logic change.

import { useState, useEffect } from "react";
import TomatoMascot from "@/components/gamification/TomatoMascot";
import type { TomatoHealthState } from "@/lib/gamification";

const INK = "#1C1A17";
const INK_SOFT = "#4A4742";
const TOMATO = "#E5462E";
const LEAF = "#5E6E38";

export interface KitchenSceneProps {
  /** Real kitchen art (3:4 PNG). When set + loadable it becomes the base scene;
   *  otherwise the built-in SVG placeholder renders. */
  baseImage?: string;
  herbLevel?: 0 | 1 | 2 | 3;
  marcoState?: TomatoHealthState;
  marcoLine?: string;
  /** When set, Marco's line becomes the primary CTA (a tappable speech-button). */
  onLineTap?: () => void;
  onStove?: () => void;
  onBookshelf?: () => void;
  onFridge?: () => void;
  onGrocery?: () => void;
  onWindow?: () => void;
  onMarco?: () => void;
  celebrateHerb?: boolean;
  /** When false, the scene omits its own floating Marco (the caller renders him,
   *  e.g. paired tightly with a speech bubble in the foreground). */
  showMarco?: boolean;
  /** When false, the zone tap-targets are not rendered (e.g. during onboarding,
   *  so they can't swallow taps meant for Marco or send the user wandering). */
  interactiveZones?: boolean;
  /** How many cookbooks stand on the shelf (one per saved recipe, capped). */
  shelfBooks?: number;
}

// Painterly cookbook colorways (cycled as the shelf fills).
const BOOK_ART = ["/kitchen/book-1.png", "/kitchen/book-2.png", "/kitchen/book-3.png"];

export default function KitchenScene({
  baseImage,
  herbLevel = 0,
  marcoState = "thriving",
  marcoLine,
  onLineTap,
  onStove,
  onBookshelf,
  onFridge,
  onGrocery,
  onWindow,
  onMarco,
  celebrateHerb = false,
  showMarco = true,
  interactiveZones = true,
  shelfBooks = 0,
}: KitchenSceneProps) {
  const [push, setPush] = useState<{ x: number; y: number } | null>(null);
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => setImgOk(true), [baseImage]);
  const usePhoto = !!baseImage && imgOk;
  function go(x: number, y: number, cb?: () => void) {
    if (!cb) return;
    setPush({ x, y });
    setTimeout(() => {
      cb();
      setPush(null);
    }, 300);
  }

  return (
    <div className="absolute inset-0 overflow-hidden select-none">
      {/* The room (base scene + progression layers), camera-pushable. Full-bleed:
          the tall art fills the screen; only croppable ceiling/floor bleed is lost. */}
      <div
        className="absolute inset-0 transition-all duration-300 ease-out"
        style={{
          transformOrigin: push ? `${push.x}% ${push.y}%` : "center",
          transform: push ? "scale(1.35)" : "scale(1)",
          opacity: push ? 0.9 : 1,
        }}
      >
        {usePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={baseImage}
            alt="Marco's kitchen"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
        <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F3E7D2" />
              <stop offset="1" stopColor="#ECD9BE" />
            </linearGradient>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FBE9C8" />
              <stop offset="1" stopColor="#F6D19B" />
            </linearGradient>
            <linearGradient id="counter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#C98A54" />
              <stop offset="1" stopColor="#B0703E" />
            </linearGradient>
            <linearGradient id="fridge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#EBDDC7" />
              <stop offset="1" stopColor="#DBC7A8" />
            </linearGradient>
          </defs>

          {/* wall + floor + counter */}
          <rect x="0" y="0" width="300" height="300" fill="url(#wall)" />
          <rect x="0" y="300" width="300" height="100" fill="#E7CFA8" />
          <rect x="0" y="292" width="300" height="14" fill="url(#counter)" />

          {/* Window (upper-left) — herb sits on the sill */}
          <g>
            <rect x="26" y="40" width="120" height="104" rx="6" fill="#7C5836" />
            <rect x="32" y="46" width="108" height="92" rx="3" fill="url(#sky)" />
            <rect x="85" y="46" width="4" height="92" fill="#7C5836" opacity="0.8" />
            <rect x="32" y="88" width="108" height="4" fill="#7C5836" opacity="0.8" />
            <rect x="22" y="140" width="128" height="10" rx="2" fill="#8A6440" />
          </g>

          {/* Bookshelf (upper-right) — collections. Starts EMPTY: it fills with
              "books" as the user's repertoire grows (a progression zone, later
              phase — same mechanism as the herb window). */}
          <g>
            <rect x="176" y="58" width="116" height="50" rx="4" fill="#8A6440" />
            <rect x="182" y="64" width="104" height="38" rx="3" fill="#E7D2B0" />
            <rect x="176" y="80" width="116" height="4" fill="#7C5836" opacity="0.6" />
            <rect x="176" y="106" width="116" height="5" rx="2" fill="#7C5836" />
          </g>

          {/* Fridge (right) */}
          <g>
            <rect x="236" y="150" width="56" height="142" rx="8" fill="url(#fridge)" stroke="#C9B190" strokeWidth="2" />
            <rect x="240" y="204" width="48" height="2" fill="#C9B190" />
            <rect x="244" y="172" width="4" height="18" rx="2" fill="#B79A72" />
            <rect x="244" y="212" width="4" height="22" rx="2" fill="#B79A72" />
          </g>

          {/* Stove + pot (center, on the counter) */}
          <g>
            <rect x="108" y="248" width="84" height="44" rx="6" fill="#3B342C" />
            <ellipse cx="150" cy="254" rx="30" ry="7" fill="#2A241E" />
            <path d="M122 254 h56 l-5 24 a4 4 0 0 1 -4 3 h-38 a4 4 0 0 1 -4 -3 z" fill="#4A4038" />
            <rect x="120" y="248" width="60" height="8" rx="4" fill="#5A4E42" />
            <g className="mk-steam" opacity="0.5">
              <path d="M140 242 q-6 -8 0 -16 q6 -8 0 -16" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M160 242 q6 -8 0 -16 q-6 -8 0 -16" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          </g>

          {/* Grocery basket (lower-left) */}
          <g>
            <path d="M22 314 h60 l-8 42 a4 4 0 0 1 -4 3 h-36 a4 4 0 0 1 -4 -3 z" fill="#B9895A" />
            <path d="M22 314 h60 l-2 10 h-56 z" fill="#A0703F" />
            <path d="M34 314 v-8 a18 18 0 0 1 36 0 v8" stroke="#A0703F" strokeWidth="4" fill="none" />
            <circle cx="42" cy="306" r="6" fill={TOMATO} />
            <circle cx="55" cy="302" r="6" fill={LEAF} />
            <circle cx="67" cy="307" r="5" fill="#E0A23C" />
          </g>

          {/* potted plant on the floor (warmth) */}
          <g>
            <path d="M118 348 q-12 -30 0 -46 q12 16 0 46 z" fill="#5E6E38" />
            <path d="M118 348 q-26 -18 -20 -40 q20 8 20 40 z" fill="#6E7E44" />
            <path d="M118 348 q26 -18 20 -40 q-20 8 -20 40 z" fill="#6E7E44" />
            <path d="M107 348 h22 l-3 20 h-16 z" fill="#B9895A" />
          </g>

          {/* Herb window layer (progression, 0→3) */}
          <g className={celebrateHerb ? "mk-pop" : undefined} style={{ transformOrigin: "88px 140px" }}>
            <HerbLayer level={herbLevel} />
          </g>
        </svg>
        )}

        {/* Ambient life — a warm light bloom + slow dust motes drifting in the
            sunbeam. This is what turns a still into a room that's alive. */}
        <div
          className="mk-glow absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(120% 90% at 18% 12%, rgba(255,214,140,0.28), rgba(255,214,140,0) 55%)" }}
        />
        <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "70%", height: "80%" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="mk-dust absolute rounded-full"
              style={{
                left: `${12 + i * 13}%`,
                top: `${18 + i * 12}%`,
                width: 3 + (i % 2),
                height: 3 + (i % 2),
                background: "rgba(255,241,214,0.9)",
                animationDelay: `${i * 1.3}s`,
                animationDuration: `${7 + i}s`,
              }}
            />
          ))}
        </div>

        {/* Steam over the pot (photo mode; the placeholder SVG has its own) */}
        {usePhoto && (
          <svg className="mk-steam absolute pointer-events-none" viewBox="0 0 40 44" aria-hidden="true" style={{ left: "44%", top: "50%", width: 44, height: 48, opacity: 0.5 }}>
            <path d="M14 40 q-6 -8 0 -16 q6 -8 0 -16" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M26 40 q6 -8 0 -16 q-6 -8 0 -16" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        )}

        {/* the floor recedes into warm shadow at the base — the scene dissolves
            into the ground instead of a hard edge */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: "36%", background: "linear-gradient(to bottom, rgba(50,28,8,0) 0%, rgba(50,28,8,0.30) 100%)" }}
        />

        {/* Marco lives on the counter, the heart of the scene */}
        {showMarco && (
          <div
            className="absolute mk-marco"
            style={{ left: usePhoto ? "50%" : "64%", top: usePhoto ? "74%" : "60%", transform: "translate(-50%,-60%)" }}
          >
            <TomatoMascot state={marcoState} size={usePhoto ? 88 : 84} greeting />
          </div>
        )}

        {/* Painterly herb on the sill — sprout at low levels, lush as it grows.
            A contact shadow at the pot base grounds it so it doesn't float. */}
        {usePhoto && (
          <button onClick={() => go(6, 42, onWindow)} aria-label="This week" className="absolute active:scale-95 transition-transform" style={{ left: "3.5%", top: "35%", width: herbLevel >= 2 ? 46 : 34 }}>
            <span aria-hidden className="absolute" style={{ left: "10%", right: "10%", bottom: -2, height: 6, borderRadius: "50%", background: "rgba(28,16,4,0.45)", filter: "blur(2.5px)" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={herbLevel >= 2 ? "/kitchen/herb.png" : "/kitchen/herb-sprout.png"} alt="" className="w-full block relative" />
          </button>
        )}
        {/* Painterly cookbooks filling the shelf — one per saved recipe, cycling colors. */}
        {usePhoto && shelfBooks > 0 && (
          <button onClick={() => go(64, 18, onBookshelf)} aria-label="Recipes" className="absolute flex items-end active:scale-95 transition-transform" style={{ left: "57%", top: "9%", height: "11%", gap: 1, filter: "drop-shadow(0 4px 7px rgba(30,18,6,0.45))" }}>
            {Array.from({ length: Math.min(shelfBooks, 5) }).map((_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={BOOK_ART[i % BOOK_ART.length]} alt="" className="h-full block" />
            ))}
          </button>
        )}
      </div>

      {/* Marco's contextual line — becomes the primary CTA when onLineTap is set */}
      {marcoLine && (
        <div className="absolute" style={{ left: "22%", top: "56%", maxWidth: 214 }}>
          {onLineTap ? (
            <button
              onClick={onLineTap}
              className="text-left active:scale-95 transition-transform"
              style={{
                background: "#FFFDF9",
                border: "1.5px solid rgba(229,70,46,0.5)",
                borderRadius: 18,
                padding: "11px 16px",
                boxShadow: "0 10px 24px rgba(28,26,23,0.18)",
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontSize: 15,
                lineHeight: 1.2,
                color: INK,
              }}
            >
              {marcoLine} <span className="not-italic font-bold" style={{ color: TOMATO }}>→</span>
            </button>
          ) : (
            <div
              style={{
                background: "white",
                border: "1px solid rgba(28,26,23,0.1)",
                borderRadius: 16,
                padding: "8px 12px",
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: INK_SOFT,
                boxShadow: "0 6px 18px rgba(28,26,23,0.10)",
              }}
            >
              {marcoLine}
            </div>
          )}
        </div>
      )}

      {/* Tappable zones (invisible hit targets over the art). Suppressed during
          onboarding so they can't swallow taps meant for Marco's bubble. */}
      {interactiveZones && (
        <>
          <Hotspot label="This week" x={27} y={24} w={34} h={30} onTap={() => go(27, 24, onWindow)} />
          <Hotspot label="Recipes" x={78} y={20} w={38} h={16} onTap={() => go(78, 20, onBookshelf)} />
          <Hotspot label="Plan" x={88} y={55} w={20} h={40} onTap={() => go(88, 55, onFridge)} />
          <Hotspot label="Cook" x={50} y={67} w={30} h={18} onTap={() => go(50, 67, onStove)} />
          <Hotspot label="Marco" x={64} y={54} w={20} h={18} onTap={onMarco} />
          <Hotspot label="Groceries" x={18} y={84} w={22} h={18} onTap={() => go(18, 84, onGrocery)} />
        </>
      )}

      <style>{`
        @keyframes mk-steam-rise { 0%{opacity:.15;transform:translateY(4px)} 50%{opacity:.5} 100%{opacity:.15;transform:translateY(-4px)} }
        .mk-steam { animation: mk-steam-rise 3.2s ease-in-out infinite; }
        @keyframes mk-pop { 0%{transform:scale(.6);opacity:.4} 60%{transform:scale(1.12)} 100%{transform:scale(1)} }
        .mk-pop { animation: mk-pop .55s cubic-bezier(.34,1.4,.64,1) both; }
        @keyframes mk-glow { 0%,100%{opacity:.7} 50%{opacity:1} }
        .mk-glow { animation: mk-glow 6s ease-in-out infinite; }
        @keyframes mk-dust { 0%{opacity:0;transform:translate(0,10px)} 20%{opacity:.9} 80%{opacity:.6} 100%{opacity:0;transform:translate(14px,-40px)} }
        .mk-dust { animation-name: mk-dust; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes mk-marco-float { 0%,100%{transform:translate(-50%,-60%)} 50%{transform:translate(-50%,-63%)} }
        .mk-marco { animation: mk-marco-float 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .mk-steam,.mk-pop,.mk-glow,.mk-dust,.mk-marco{ animation:none!important } }
      `}</style>
    </div>
  );
}

function Hotspot({
  label,
  x,
  y,
  w,
  h,
  onTap,
}: {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  onTap?: () => void;
}) {
  return (
    <button
      onClick={onTap}
      aria-label={label}
      className="absolute group flex items-start justify-center active:scale-95 transition-transform"
      style={{ left: `${x - w / 2}%`, top: `${y - h / 2}%`, width: `${w}%`, height: `${h}%` }}
    >
      <span
        className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold pointer-events-none whitespace-nowrap"
        style={{ background: "rgba(255,253,247,0.95)", color: INK, border: "1px solid rgba(28,26,23,0.12)" }}
      >
        {label}
      </span>
    </button>
  );
}

// The herb window — Marco's consistency zone. Same footprint at every level; it
// TRANSFORMS (fuller / richer), it does not pile up. Coords sit on the sill (y140).
function HerbLayer({ level }: { level: 0 | 1 | 2 | 3 }) {
  const pot = (cx: number, s = 1) => (
    <path key={`pot${cx}`} d={`M${cx - 10 * s} 140 h${20 * s} l${-2 * s} ${14 * s} h${-16 * s} z`} fill="#B9895A" />
  );
  const sprig = (cx: number, top: number, spread: number, fill = LEAF) => (
    <g key={`s${cx}-${top}`} fill={fill}>
      <path d={`M${cx} 140 q${-spread} ${-(140 - top) / 1.4} 0 ${-(140 - top)}`} stroke={fill} strokeWidth="2.5" fill="none" />
      <ellipse cx={cx - spread * 0.6} cy={top + (140 - top) * 0.3} rx={4} ry={6} />
      <ellipse cx={cx + spread * 0.5} cy={top + (140 - top) * 0.55} rx={4} ry={6} />
      <ellipse cx={cx} cy={top} rx={5} ry={7} />
    </g>
  );

  if (level <= 0) {
    return (
      <g>
        {pot(88, 0.9)}
        <ellipse cx="84" cy="134" rx="4" ry="6" fill="#7E8E4E" />
        <ellipse cx="92" cy="134" rx="4" ry="6" fill="#7E8E4E" />
      </g>
    );
  }
  if (level === 1) {
    return (
      <g>
        {pot(88)}
        {sprig(88, 108, 10)}
        {sprig(82, 116, 8, "#6E7E44")}
        {sprig(95, 116, 8, "#6E7E44")}
      </g>
    );
  }
  if (level === 2) {
    return (
      <g>
        {pot(60, 0.8)}
        {pot(88, 0.9)}
        {pot(116, 0.8)}
        {sprig(60, 116, 7, "#6E7E44")}
        {sprig(88, 106, 10)}
        {sprig(116, 118, 7, "#7E8E4E")}
        {sprig(83, 118, 7, "#6E7E44")}
        {sprig(93, 118, 7, "#6E7E44")}
      </g>
    );
  }
  return (
    <g>
      {pot(52, 0.8)}
      {pot(78, 0.95)}
      {pot(104, 0.85)}
      {pot(128, 0.75)}
      {sprig(52, 114, 8, "#6E7E44")}
      {sprig(78, 100, 12)}
      {sprig(72, 112, 8, "#6E7E44")}
      {sprig(85, 112, 8, "#6E7E44")}
      {sprig(104, 108, 9, "#7E8E4E")}
      {sprig(128, 118, 6, "#6E7E44")}
      <path d="M40 150 q-6 20 4 34 q8 12 2 26" stroke={LEAF} strokeWidth="2.5" fill="none" />
      <ellipse cx="44" cy="176" rx="3.5" ry="5" fill={LEAF} />
      <ellipse cx="46" cy="196" rx="3.5" ry="5" fill="#6E7E44" />
    </g>
  );
}
