"use client";

// The Home "room" — three canonical 2D views of ONE kitchen (Left = growth/prep,
// Center = cooking/skill [default], Right = identity/history) that the user swipes
// between as if looking around. Deliberately NOT a 3D camera: three connected
// panels with a slide + light parallax, so each progression object only ever needs
// one asset in its one canonical view.
//
// SVG/CSS + React only (no anim libs). Key behaviours:
//  • Default to Center; swipe L/R with snap + edge resistance.
//  • Off-center panels dim/recede slightly (a "focus" parallax) so the one you're
//    looking at pops — sells "looking around" without needing foreground cutouts.
//  • reveal(): when a cook changes an OFF-SCREEN panel, the room auto-pans there,
//    holds, then eases back — so progression is never hidden behind a swipe.
//  • Edge chevrons + a one-time "look around" hint aid discovery.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type RoomPanel = "left" | "center" | "right";
const ORDER: RoomPanel[] = ["left", "center", "right"];
const idxOf = (p: RoomPanel) => ORDER.indexOf(p);

export interface RoomViewProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  initial?: RoomPanel;
  /** Bump `nonce` to auto-pan to `panel`, hold, then ease back to where the user was. */
  reveal?: { panel: RoomPanel; nonce: number } | null;
  onPanelChange?: (p: RoomPanel) => void;
  /** Show the one-time "look around your kitchen" hint. */
  hint?: boolean;
  /** Hide the built-in panel dots (e.g. when the host screen supplies its own chrome/nav). */
  hideDots?: boolean;
}

export default function RoomView({ left, center, right, initial = "center", reveal, onPanelChange, hint = true, hideDots = false }: RoomViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [index, setIndex] = useState(idxOf(initial)); // where the user parked
  const [view, setView] = useState(idxOf(initial)); // where the room currently looks (may differ during a reveal)
  const [drag, setDrag] = useState(0); // live finger offset (px)
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(hint);
  const [overview, setOverview] = useState(false); // zoomed out to see the whole room
  const startX = useRef(0);
  const startView = useRef(view);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodes = [left, center, right];

  // Measure the panel width.
  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const set = () => setW(el.clientWidth);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-pan reveal: look at `panel`, hold, then return to the parked index.
  useEffect(() => {
    if (!reveal || !reveal.nonce) return;
    const target = idxOf(reveal.panel);
    if (target === index) return; // already there — nothing to reveal
    setView(target);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setView(index), 1500);
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.nonce]);

  const settle = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(ORDER.length - 1, next));
      setIndex(clamped);
      setView(clamped);
      onPanelChange?.(ORDER[clamped]);
    },
    [onPanelChange]
  );

  const onDown = (e: React.PointerEvent) => {
    if (overview) return; // in overview, taps focus a panel instead of dragging
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setDragging(true);
    startX.current = e.clientX;
    startView.current = view;
    setView(index); // a touch cancels any in-flight reveal, snap intent to parked
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setShowHint(false);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    let dx = e.clientX - startX.current;
    // resistance at the ends
    const atStart = index === 0 && dx > 0;
    const atEnd = index === ORDER.length - 1 && dx < 0;
    if (atStart || atEnd) dx *= 0.35;
    setDrag(dx);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = Math.max(48, w * 0.18);
    if (drag <= -threshold) settle(index + 1);
    else if (drag >= threshold) settle(index - 1);
    else settle(index);
    setDrag(0);
  };

  // Track offset: base on `view` (so reveals move it too), plus live drag.
  const tx = w ? -(view * w) + (dragging ? drag : 0) : 0;
  // Before we've measured, position with a % fallback so Center shows immediately
  // (no one-frame flash of the Left panel). In overview, scale the whole 3-panel
  // strip down to fit the screen width so the user sees the entire room at once.
  const scaleFit = 1 / ORDER.length;
  const trackTransform = overview
    ? `translateX(0px) scale(${scaleFit})`
    : w
    ? `translateX(${tx}px)`
    : `translateX(${-(view * (100 / ORDER.length))}%)`;

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden touch-pan-y select-none"
      style={{ background: overview ? "#0F0B06" : "#EFE5D2" }}
      onDoubleClick={() => setOverview((o) => !o)}
    >
      {/* The three-panel track */}
      <div
        className="absolute inset-y-0 left-0 flex"
        style={{
          width: w ? w * ORDER.length : "300%",
          transform: trackTransform,
          transformOrigin: "left center",
          transition: dragging ? "none" : "transform 460ms cubic-bezier(.22,.61,.36,1)",
          willChange: "transform",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {nodes.map((node, i) => {
          // How centered is this panel right now (1 = dead center, 0 = a full panel away)?
          const offset = w ? (i * w + tx) / w : 0; // 0 when centered, ±1 at neighbors
          const away = Math.min(1, Math.abs(offset));
          return (
            <div
              key={i}
              onClick={overview ? () => { setOverview(false); settle(i); } : undefined}
              className="relative flex-shrink-0 h-full overflow-hidden"
              style={{ width: w || "33.333%", cursor: overview ? "pointer" : undefined }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `scale(${overview ? 1 : 1 - away * 0.03})`,
                  transition: dragging ? "none" : "transform 460ms cubic-bezier(.22,.61,.36,1)",
                }}
              >
                {node}
              </div>
              {/* focus parallax: neighbors recede into soft shadow (off in overview) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "rgba(20,12,4,1)", opacity: overview ? 0 : away * 0.32, transition: dragging ? "none" : "opacity 460ms ease" }}
              />
            </div>
          );
        })}
      </div>

      {/* Zoom-out / focus toggle — see the whole room, or zoom back in */}
      <button
        aria-label={overview ? "Zoom into a view" : "See the whole kitchen"}
        onClick={() => setOverview((o) => !o)}
        className="absolute z-20 flex items-center justify-center rounded-full active:scale-95 transition-transform"
        style={{ top: "calc(env(safe-area-inset-top,0px) + 12px)", right: 12, width: 36, height: 36, background: "rgba(255,253,247,0.82)", boxShadow: "0 4px 14px rgba(28,20,4,0.2)" }}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#1C1A17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {overview ? (
            <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
          ) : (
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          )}
        </svg>
      </button>

      {/* Edge chevrons — fade out at the ends (hidden in overview) */}
      {!overview && <Chevron dir="left" show={view > 0} onClick={() => settle(index - 1)} />}
      {!overview && <Chevron dir="right" show={view < ORDER.length - 1} onClick={() => settle(index + 1)} />}

      {/* Panel dots (hidden in overview or when the host supplies its own chrome) */}
      {!overview && !hideDots && (
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-1.5" style={{ bottom: "calc(env(safe-area-inset-bottom,0px) + 12px)" }}>
          {ORDER.map((p, i) => (
            <button
              key={p}
              aria-label={`Look ${p}`}
              onClick={() => settle(i)}
              className="rounded-full transition-all"
              style={{ width: i === view ? 18 : 7, height: 7, background: i === view ? "#E5462E" : "rgba(28,20,4,0.28)" }}
            />
          ))}
        </div>
      )}

      {/* One-time "look around" hint */}
      {showHint && !overview && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: "calc(env(safe-area-inset-top,0px) + 64px)" }}>
          <div
            className="mk-hint flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(255,253,247,0.94)", boxShadow: "0 8px 24px rgba(28,20,4,0.22)", fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 14, color: "#1C1A17" }}
          >
            <span aria-hidden>‹</span> Look around your kitchen <span aria-hidden>›</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mk-hint { 0%{opacity:0;transform:translateY(-6px)} 12%{opacity:1;transform:none} 82%{opacity:1} 100%{opacity:0} }
        .mk-hint { animation: mk-hint 4.4s ease forwards; }
        @media (prefers-reduced-motion: reduce){ .mk-hint{ animation:none } }
      `}</style>
    </div>
  );
}

function Chevron({ dir, show, onClick }: { dir: "left" | "right"; show: boolean; onClick: () => void }) {
  return (
    <button
      aria-label={dir === "left" ? "Look left" : "Look right"}
      onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-opacity"
      style={{
        [dir]: 10,
        width: 34,
        height: 34,
        background: "rgba(255,253,247,0.72)",
        boxShadow: "0 4px 14px rgba(28,20,4,0.18)",
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
      } as React.CSSProperties}
    >
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#1C1A17" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {dir === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  );
}
