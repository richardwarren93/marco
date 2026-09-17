"use client";

// Continuous-pan room: ONE wide master image, with a camera that pans across it
// and snaps to focal points (sink / stove / fridge). Because it's a single
// continuous image, the counter, shelves and floor flow past as you swipe — it
// reads as looking around one room, and any object inpainted into the master
// lines up in every view AND the whole-room / My Kitchen hero automatically.
//
// SVG/CSS + React only. Fills the viewport height (full floor-to-ceiling) and
// pans horizontally.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface RoomPanProps {
  image: string;
  /** imageW / imageH of the master. */
  aspect: number;
  /** Focal x-centers as a fraction of image width (left→right). Default sink/stove/fridge. */
  focals?: number[];
  /** Index of the focal to start on (default: middle). */
  initial?: number;
  onFocalChange?: (i: number) => void;
  /** Bump `nonce` to auto-pan to `index`, hold, then ease back. */
  reveal?: { index: number; nonce: number } | null;
  hint?: boolean;
  hideDots?: boolean;
  /** Called by the expand control (e.g. navigate to My Kitchen). */
  onExpand?: () => void;
}

const DEFAULT_FOCALS = [0.155, 0.49, 0.76];

export default function RoomPan({ image, aspect, focals = DEFAULT_FOCALS, initial, onFocalChange, reveal, hint = true, hideDots = false, onExpand }: RoomPanProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const mid = initial ?? Math.floor(focals.length / 2);
  const [index, setIndex] = useState(mid); // parked focal
  const [view, setView] = useState(mid); // currently-looked focal (may differ mid-reveal)
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(hint);
  const startX = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const set = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const imgW = size.h * aspect; // on-screen image width (height fills the viewport)
  const clamp = useCallback((tx: number) => Math.min(0, Math.max(size.w - imgW, tx)), [size.w, imgW]);
  const txFor = useCallback((i: number) => clamp(size.w / 2 - focals[i] * imgW), [clamp, size.w, imgW, focals]);

  useEffect(() => {
    if (!reveal || !reveal.nonce) return;
    if (reveal.index === index) return;
    setView(reveal.index);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setView(index), 1600);
    return () => { if (revealTimer.current) clearTimeout(revealTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.nonce]);

  const settle = useCallback((next: number) => {
    const i = Math.max(0, Math.min(focals.length - 1, next));
    setIndex(i); setView(i); onFocalChange?.(i);
  }, [focals.length, onFocalChange]);

  const onDown = (e: React.PointerEvent) => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setDragging(true); startX.current = e.clientX; setView(index);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setShowHint(false);
  };
  const onMove = (e: React.PointerEvent) => { if (dragging) setDrag(e.clientX - startX.current); };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    // snap to the focal whose tx is nearest the dragged position
    const current = txFor(index) + drag;
    let best = index, bestD = Infinity;
    for (let i = 0; i < focals.length; i++) { const d = Math.abs(txFor(i) - current); if (d < bestD) { bestD = d; best = i; } }
    settle(best); setDrag(0);
  };

  const tx = (size.w ? txFor(view) : 0) + (dragging ? drag : 0);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden touch-pan-y select-none" style={{ background: "#EFE5D2" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt="Your kitchen"
        draggable={false}
        style={{
          position: "absolute", top: 0, left: 0, height: "100%", width: "auto", maxWidth: "none",
          transform: `translateX(${tx}px)`,
          transition: dragging ? "none" : "transform 480ms cubic-bezier(.22,.61,.36,1)",
          willChange: "transform",
        }}
      />

      {/* expand → whole-room / My Kitchen */}
      {onExpand && (
        <button aria-label="See the whole kitchen" onClick={onExpand}
          className="absolute z-20 flex items-center justify-center rounded-full active:scale-95 transition-transform"
          style={{ top: "calc(env(safe-area-inset-top,0px) + 12px)", right: 12, width: 36, height: 36, background: "rgba(255,253,247,0.82)", boxShadow: "0 4px 14px rgba(28,20,4,0.2)" }}>
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#1C1A17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </button>
      )}

      {/* chevrons */}
      {view > 0 && <Chevron dir="left" onClick={() => settle(index - 1)} />}
      {view < focals.length - 1 && <Chevron dir="right" onClick={() => settle(index + 1)} />}

      {/* focal dots */}
      {!hideDots && (
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-1.5" style={{ bottom: "calc(env(safe-area-inset-bottom,0px) + 12px)" }}>
          {focals.map((_, i) => (
            <button key={i} aria-label={`View ${i + 1}`} onClick={() => settle(i)} className="rounded-full transition-all"
              style={{ width: i === view ? 18 : 7, height: 7, background: i === view ? "#E5462E" : "rgba(28,20,4,0.32)" }} />
          ))}
        </div>
      )}

      {showHint && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: "calc(env(safe-area-inset-top,0px) + 64px)" }}>
          <div className="mk-hint flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(255,253,247,0.94)", boxShadow: "0 8px 24px rgba(28,20,4,0.22)", fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 14, color: "#1C1A17" }}>
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

function Chevron({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button aria-label={dir === "left" ? "Look left" : "Look right"} onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full"
      style={{ [dir]: 10, width: 34, height: 34, background: "rgba(255,253,247,0.72)", boxShadow: "0 4px 14px rgba(28,20,4,0.18)" } as React.CSSProperties}>
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#1C1A17" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {dir === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  );
}
