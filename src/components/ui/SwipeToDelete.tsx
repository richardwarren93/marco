"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  onDelete: () => void;
  children: React.ReactNode;
}

const DISMISS_THRESHOLD = 0.35; // 35% of row width triggers delete

export default function SwipeToDelete({ onDelete, children }: Props) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const locked = useRef<"horizontal" | "vertical" | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (dismissing) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
    setIsDragging(true);
  }, [dismissing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dismissing) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Lock direction after 8px of movement
    if (!locked.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }
      return;
    }

    if (locked.current === "vertical") return;

    // Only allow swipe left
    if (dx < 0) {
      setOffset(dx);
    }
  }, [dismissing]);

  const onTouchEnd = useCallback(() => {
    if (dismissing) return;
    setIsDragging(false);
    locked.current = null;

    const width = rowRef.current?.offsetWidth || 300;
    if (Math.abs(offset) > width * DISMISS_THRESHOLD) {
      // Past threshold — animate off-screen and delete
      setDismissing(true);
      setOffset(-width);
      setTimeout(() => {
        onDelete();
      }, 250);
    } else {
      // Snap back
      setOffset(0);
    }
  }, [offset, onDelete, dismissing]);

  const progress = rowRef.current
    ? Math.min(Math.abs(offset) / (rowRef.current.offsetWidth * DISMISS_THRESHOLD), 1)
    : 0;

  return (
    <div className="relative overflow-hidden" ref={rowRef}>
      {/* Red background behind — only render when swiping */}
      {(isDragging || offset < 0 || dismissing) && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-6"
          style={{
            background: `rgba(239, 68, 68, ${0.7 + progress * 0.3})`,
          }}
        >
          <svg
            className="w-5 h-5 text-white transition-transform"
            style={{ transform: `scale(${0.8 + progress * 0.4})` }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
      )}

      {/* Content row */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.25s ease-out",
          opacity: dismissing ? 0.5 : 1,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
