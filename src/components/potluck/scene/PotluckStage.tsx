"use client";

/* The canvas, and everything that keeps it from being a liability.
 *
 * Pixi is ~400KB. The app already goes to trouble to keep `motion` off routes
 * that do not use it (see AppChrome), so Pixi is imported INSIDE the effect —
 * it is fetched when a potluck is opened and never on any other route, and
 * never on the server.
 *
 * If it fails to initialise — old browser, no WebGL, a corporate policy, a
 * throttled network — `onUnavailable` fires and the page renders its ordinary
 * list instead. A table that cannot draw must not take the potluck with it.
 *
 * The canvas is aria-hidden and shadowed by a real list of buttons. Everything
 * you can tap in the scene you can also reach with a keyboard and hear read
 * out, which is the only way a canvas can carry essential functionality.
 */

import { useEffect, useRef, useState } from "react";
import type { SceneModel } from "./model";
import { celebrate } from "@/lib/haptics";
import { DISPLAY, HAND, INK, INK_MUTED, INK_SOFT, PAPER, TOMATO } from "@/lib/theme";

type SceneLike = {
  reconcile: (m: SceneModel) => void;
  fit: (w: number, h: number, animate?: boolean) => void;
  focus: (id: string, w: number, h: number) => void;
  setArrivalSignal: (fn: () => void) => void;
  fly: (fromSeatId: string, toDishId: string) => void;
  snapshot: () => HTMLCanvasElement | null;
  destroy: () => void;
};

export default function PotluckStage({ model, focused, flight, onApi, onSeatTap, onDishTap, onEmptyTap, onUnavailable }: {
  model: SceneModel;
  /** The seat or dish the sheet is open for. null re-frames the whole table. */
  focused: string | null;
  /** A reaction to send across the table. The id makes a repeat re-fire. */
  flight: { id: string; from: string; to: string } | null;
  /** Hands the page a way to photograph the table for the postcard. */
  onApi?: (api: { snapshot: () => HTMLCanvasElement | null }) => void;
  onSeatTap: (id: string) => void;
  onDishTap: (id: string) => void;
  onEmptyTap: () => void;
  onUnavailable: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneLike | null>(null);
  const appRef = useRef<{ destroy: (a?: boolean, b?: object) => void; canvas: HTMLCanvasElement; renderer: { resize: (w: number, h: number) => void }; ticker: { start: () => void; stop: () => void } } | null>(null);
  const size = useRef({ w: 0, h: 0 });
  // The model changes faster than the scene is rebuilt; a ref keeps the
  // callbacks stable so the effect below never re-runs and re-creates Pixi.
  const latest = useRef(model);
  latest.current = model;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const el = host.current;
    if (!el) return;

    (async () => {
      try {
        const [{ Application }, { PotluckScene }, { loadSprites }] = await Promise.all([
          import("pixi.js"),
          import("./PotluckScene"),
          import("./textures"),
        ]);
        if (cancelled) return;

        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const rect = el.getBoundingClientRect();
        const app = new Application();
        await app.init({
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
          backgroundAlpha: 0,
          antialias: true,
          // Capped: a 3x phone renders nine times the pixels for no visible gain.
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          preference: "webgl",
        });
        if (cancelled) { app.destroy(true, { children: true }); return; }

        /* The art is fetched, not drawn, so the scene cannot be constructed
           until it is here. A failed fetch falls through to the catch below
           and the page shows its plain list instead of an empty room — the
           same fallback a machine without WebGL gets. */
        const bank = await loadSprites(app.renderer);
        if (cancelled) { app.destroy(true, { children: true }); return; }

        el.appendChild(app.canvas);
        app.canvas.style.width = "100%";
        app.canvas.style.height = "100%";
        app.canvas.style.display = "block";

        const s = new PotluckScene(app, bank, {
          onSeatTap: (id) => onSeatTap(id),
          onDishTap: (id) => onDishTap(id),
          onEmptyTap: () => onEmptyTap(),
        }, reduced);

        // Something landing on the table is worth feeling on a phone.
        s.setArrivalSignal(() => celebrate());
        onApi?.({ snapshot: () => s.snapshot() });
        appRef.current = app as unknown as typeof appRef.current;
        scene.current = s;
        size.current = { w: rect.width, h: rect.height };
        s.reconcile(latest.current);
        s.fit(rect.width, rect.height);
        setReady(true);
      } catch {
        if (!cancelled) onUnavailable();
      }
    })();

    return () => {
      cancelled = true;
      scene.current?.destroy();
      scene.current = null;
      // `true` also removes the canvas from the DOM; children/textures go with it.
      appRef.current?.destroy(true, { children: true, texture: true });
      appRef.current = null;
    };
    // Deliberately once: re-running would tear down and rebuild the whole scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the camera framed as the viewport changes (rotation, keyboard, chrome).
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 2 || height < 2) return;
      size.current = { w: width, h: height };
      appRef.current?.renderer.resize(width, height);
      scene.current?.fit(width, height, true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Nothing animates while the tab is in the background.
  useEffect(() => {
    const onVis = () => {
      const app = appRef.current;
      if (!app) return;
      if (document.visibilityState === "hidden") app.ticker.stop();
      else app.ticker.start();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => { scene.current?.reconcile(model); }, [model]);

  // The camera leans toward whatever the sheet is about, and lets go when it
  // closes. Never a jump: both are tweens.
  useEffect(() => {
    const { w, h } = size.current;
    if (!scene.current || w < 2) return;
    if (focused) scene.current.focus(focused, w, h);
    else scene.current.fit(w, h, true);
  }, [focused]);

  useEffect(() => { if (flight) scene.current?.fly(flight.from, flight.to); }, [flight]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={host} aria-hidden style={{ position: "absolute", inset: 0 }} />
      {!ready && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.6 }}>
          laying the table…
        </div>
      )}
      <StageAlternative model={model} onSeatTap={onSeatTap} onDishTap={onDishTap} onEmptyTap={onEmptyTap} />
    </div>
  );
}

/* Everything in the scene, as real controls. Visually hidden but focusable —
   so a keyboard, a screen reader and a tap all reach the same actions. */
function StageAlternative({ model, onSeatTap, onDishTap, onEmptyTap }: {
  model: SceneModel;
  onSeatTap: (id: string) => void;
  onDishTap: (id: string) => void;
  onEmptyTap: () => void;
}) {
  return (
    <ul className="sr-only">
      {model.seats.map((s) => (
        <li key={s.id}>
          <button onClick={() => (s.state === "empty" ? onEmptyTap() : onSeatTap(s.id))}>
            {s.state === "empty" ? "Empty seat — invite somebody" : `${s.name}, ${
              s.state === "cooked" ? "has cooked" : s.state === "planned" ? "is bringing something" : "has not said yet"
            }`}
          </button>
        </li>
      ))}
      {model.dishes.map((d) => (
        <li key={d.id}>
          <button onClick={() => onDishTap(d.id)}>{d.title} — {d.who}, {d.cooked ? "cooked" : "still coming"}</button>
        </li>
      ))}
    </ul>
  );
}

export function StageFallbackNote() {
  return (
    <div style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 12px", fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: INK_SOFT }}>
      The table could not be drawn here — everything still works below.{" "}
      <span style={{ fontFamily: HAND, color: TOMATO }}>no WebGL</span>
      <span style={{ color: INK_MUTED }} />
    </div>
  );
}
