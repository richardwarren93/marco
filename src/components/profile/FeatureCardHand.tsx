"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

/* The profile hub's feature tiles as an actual hand of cards — Slay the Spire
   style. A horizontal scroll-snap carousel of playing-card-shaped cards: the
   centered card stands upright and lifted, neighbors fan away (rotate + sink +
   shrink), driven by scroll position via a rAF-throttled handler. Each card has
   a "cost gem" (the live stat), an art zone, a title ribbon, and a footer line.

   Snap targets are the OUTER wrappers; transforms go on the INNER card so
   scroll-snap geometry never fights the fan effect. */

export interface HandCard {
  href: string;
  title: string;
  /** The corner gem — the card's headline stat (number or emoji). */
  gem: string | number;
  /** Suit color: gem + ribbon accent. */
  tint: string;
  /** Art-zone background (a pale tint of the suit color). */
  artBg: string;
  /** Art zone content (emoji, bars, avatars…). */
  art: ReactNode;
  subtitle: string;
}

const CARD_W = 190;
const CARD_H = 258;

export default function FeatureCardHand({ cards }: { cards: HandCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      el.querySelectorAll<HTMLElement>("[data-hand-card]").forEach((card) => {
        const r = card.getBoundingClientRect();
        const d = (r.left + r.width / 2 - centerX) / (rect.width || 1); // ≈ -1..1
        const c = Math.max(-1, Math.min(1, d));
        card.style.transform = `rotate(${(c * 7).toFixed(2)}deg) translateY(${(Math.abs(c) * 26).toFixed(1)}px) scale(${(1 - Math.abs(c) * 0.07).toFixed(3)})`;
        const wrapper = card.parentElement;
        if (wrapper) wrapper.style.zIndex = String(100 - Math.round(Math.abs(c) * 50));
      });
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cards.length]);

  return (
    <div
      ref={scrollerRef}
      className="scrollbar-hide"
      style={{
        display: "flex",
        gap: "12px",
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        // Let the first/last card reach dead center.
        paddingLeft: `calc(50% - ${CARD_W / 2}px)`,
        paddingRight: `calc(50% - ${CARD_W / 2}px)`,
        paddingTop: "10px",
        paddingBottom: "26px", // room for the fanned neighbors' translateY
      }}
    >
      {cards.map((card) => (
        <div
          key={card.href}
          style={{
            flexShrink: 0,
            width: CARD_W,
            height: CARD_H,
            scrollSnapAlign: "center",
            position: "relative",
          }}
        >
          <Link
            href={card.href}
            data-hand-card
            className="block active:scale-[0.97]"
            style={{
              width: "100%",
              height: "100%",
              transformOrigin: "bottom center",
              willChange: "transform",
              borderRadius: "18px",
              background: "#FFFDF7",
              border: "2.5px solid #1C1A17",
              boxShadow: "0 12px 28px -10px rgba(28,26,23,0.45), 0 2px 0 rgba(28,26,23,0.2)",
              overflow: "visible",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              transition: "none",
            }}
          >
            {/* Cost gem — the live stat, like the mana gem */}
            <span
              className="absolute flex items-center justify-center font-black"
              style={{
                top: -12,
                left: -12,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: card.tint,
                color: "#fff",
                border: "2.5px solid #1C1A17",
                fontSize: typeof card.gem === "number" || String(card.gem).length > 2 ? "14px" : "18px",
                fontFamily: "var(--font-display, Georgia, serif)",
                boxShadow: "0 3px 8px rgba(28,26,23,0.35)",
                zIndex: 2,
              }}
            >
              {card.gem}
            </span>

            {/* Art zone */}
            <div
              className="flex flex-col items-center justify-center gap-2 px-4"
              style={{
                flex: 1,
                minHeight: 0,
                margin: "8px 8px 0",
                borderRadius: "12px",
                background: card.artBg,
                border: "1px solid rgba(28,26,23,0.08)",
              }}
            >
              {card.art}
            </div>

            {/* Title ribbon */}
            <div
              className="text-center mx-1.5 -mt-3 relative"
              style={{
                background: "#1C1A17",
                color: "#F5EEE2",
                borderRadius: "8px",
                padding: "6px 8px",
                boxShadow: `inset 0 0 0 1.5px ${card.tint}`,
                zIndex: 1,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                  fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 600',
                  fontSize: "15px",
                  letterSpacing: "-0.01em",
                }}
              >
                {card.title}
              </span>
            </div>

            {/* Footer line */}
            <div className="text-center px-3" style={{ padding: "9px 12px 12px" }}>
              <p className="truncate" style={{ fontSize: "11.5px", color: "#6B655C", fontStyle: "italic", fontFamily: "var(--font-display, Georgia, serif)" }}>
                {card.subtitle}
              </p>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
