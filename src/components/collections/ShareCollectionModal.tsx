"use client";

import { useState } from "react";
import type { Collection } from "@/types";
import { CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, MONO, PAPER, TOMATO } from "@/lib/theme";

interface Props {
  collection: Collection;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareCollectionModal({ collection, isOpen, onClose }: Props) {
  const [isPublic, setIsPublic] = useState(collection.is_public);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/collections/shared/${collection.share_token}`
    : "";

  async function handleTogglePublic() {
    setToggling(true);
    try {
      const res = await fetch("/api/collections/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: collection.id, is_public: !isPublic }),
      });

      if (res.ok) {
        setIsPublic(!isPublic);
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md"
        style={{ background: PAPER, borderRadius: 20, border: `2.5px solid ${INK}`, boxShadow: `5px 6px 0 ${INK}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `2.5px solid ${INK}` }}>
          <h2 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>Share collection</h2>
          <button onClick={onClose} aria-label="Close" className="p-1" style={{ color: INK_MUTED }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14 }}>Public link</p>
              <p className="text-xs" style={{ color: INK_SOFT }}>Anyone with the link can view this collection</p>
            </div>
            {/* The app's first switch in this language, so it is built from the
                same parts as everything else: ink edge, hard shadow, lime for
                on. The knob carries its own edge so it reads as a sticker
                sitting in the track rather than a dot printed on it. */}
            <button
              onClick={handleTogglePublic}
              disabled={toggling}
              role="switch"
              aria-checked={isPublic}
              aria-label="Public link"
              className="relative flex-shrink-0 inline-flex items-center transition-colors disabled:opacity-60"
              style={{
                width: 52,
                height: 30,
                borderRadius: 99,
                background: isPublic ? LIME : CREAM_WARM,
                border: `2.5px solid ${INK}`,
                boxShadow: `2px 2px 0 ${INK}`,
              }}
            >
              <span
                className="inline-block transition-transform"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 99,
                  background: PAPER,
                  border: `2px solid ${INK}`,
                  transform: isPublic ? "translateX(25px)" : "translateX(4px)",
                }}
              />
            </button>
          </div>
        </div>

        {isPublic && (
          <div className="px-5 py-4" style={{ borderTop: `2px solid ${INK}` }}>
            <p className="text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
              Share link
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Share link"
                className="flex-1 min-w-0 px-3.5 py-2.5 outline-none"
                style={{ background: CREAM_WARM, color: INK_SOFT, border: `2px solid ${INK}`, borderRadius: 10, fontFamily: MONO, fontSize: 12 }}
              />
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-4 py-2.5 active:scale-95 transition-transform"
                style={{
                  background: TOMATO,
                  color: PAPER,
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 13.5,
                  border: `2.5px solid ${INK}`,
                  borderRadius: 10,
                  boxShadow: `3px 3px 0 ${INK}`,
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
