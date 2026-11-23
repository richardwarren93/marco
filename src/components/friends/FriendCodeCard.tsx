"use client";

import { useState } from "react";
import { BUTTER, DISPLAY, INK, MONO, PAPER, TOMATO } from "@/lib/theme";

interface FriendCodeCardProps {
  friendCode: string;
}

export default function FriendCodeCard({ friendCode }: FriendCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/add/${friendCode}`
      : "";

  async function handleCopy() {
    await navigator.clipboard.writeText(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Add me on Marco!",
          text: `Add me on Marco! My friend code is ${friendCode}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy the full message
      await navigator.clipboard.writeText(
        `Add me on Marco! My friend code is ${friendCode} — ${shareUrl}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const BTN = {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 13.5,
    border: `2.5px solid ${INK}`,
    borderRadius: 10,
    boxShadow: `3px 3px 0 ${INK}`,
  } as const;

  return (
    <div
      className="p-5 text-center"
      style={{ background: BUTTER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
    >
      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: INK, opacity: 0.65, fontWeight: 700 }}>
        Your friend code
      </p>
      <p
        className="my-2"
        style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, letterSpacing: "0.12em", color: INK }}
      >
        {friendCode}
      </p>
      {/* Was: "so {displayName}'s friends can find you" — shown to the owner of
          the code, so it told Richard to share it with Richard's friends to
          find Richard. */}
      <p className="text-[12.5px] mb-4" style={{ color: INK, opacity: 0.7 }}>
        Share it and friends can add you straight away
      </p>
      <div className="flex gap-2.5 justify-center">
        <button
          onClick={handleCopy}
          className="px-4 py-2 active:scale-95 transition-transform"
          style={{ ...BTN, background: PAPER, color: INK }}
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
        <button
          onClick={handleShare}
          className="px-4 py-2 active:scale-95 transition-transform"
          style={{ ...BTN, background: TOMATO, color: PAPER }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
