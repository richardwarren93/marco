"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";

/**
 * Friends-feed empty state. Two scenarios:
 *
 *   - hasFriends === false: the user has no friends yet. Show the friend
 *     code prominently and a "Add a friend" CTA. Per the brand voice:
 *     "recipes get richer when they're passed on."
 *
 *   - hasFriends === true: friends exist but none have activity. Offer a
 *     gentle nudge to switch to Community.
 */

interface Props {
  hasFriends: boolean;
  onSwitchToCommunity?: () => void;
}

interface ProfileResponse {
  profile?: {
    friend_code?: string;
    display_name?: string;
  };
}

export default function FriendsEmptyState({ hasFriends, onSwitchToCommunity }: Props) {
  const { data: profileData } = useSWR<ProfileResponse>(
    hasFriends ? null : "/api/profile",
    apiFetcher,
    { revalidateOnFocus: false }
  );
  const friendCode = profileData?.profile?.friend_code ?? null;

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  if (hasFriends) {
    return (
      <div className="text-center py-12 px-4">
        <p
          className="marco-signature"
          style={{ fontSize: "2.5rem", color: "var(--ink, #1C1A17)" }}
        >
          quiet kitchens
        </p>
        <p
          className="mt-4 max-w-sm mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "17px",
            lineHeight: 1.45,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          your friends haven&apos;t been cooking lately.
        </p>
        {onSwitchToCommunity && (
          <button
            onClick={onSwitchToCommunity}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--ink, #1C1A17)",
              color: "var(--cream, #F5EEE2)",
              borderRadius: "100px",
            }}
          >
            Browse the community →
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto"
      style={{
        background: "#fff",
        border: "1px solid var(--line, rgba(28,26,23,0.12))",
      }}
    >
      <p
        className="marco-signature"
        style={{ fontSize: "3rem", color: "var(--ink, #1C1A17)" }}
      >
        no signatures yet
      </p>

      <p
        className="mt-5 max-w-md mx-auto"
        style={{
          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
          fontStyle: "italic",
          fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
          fontSize: "18px",
          lineHeight: 1.5,
          color: "var(--ink-soft, #4A4742)",
        }}
      >
        recipes get richer when they&apos;re passed on. add a friend and
        watch their kitchen.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/profile?tab=friends"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
          style={{
            background: "var(--tomato, #E5462E)",
            color: "#fff",
            borderRadius: "100px",
          }}
        >
          Add a friend →
        </Link>
      </div>

      {friendCode && (
        <div className="mt-10 pt-8" style={{ borderTop: "1px solid var(--line, rgba(28,26,23,0.12))" }}>
          <p className="marco-mono mb-3">Your code</p>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-3 transition-opacity hover:opacity-80 active:scale-[0.98]"
            aria-label="Copy friend code"
          >
            <span
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
                fontSize: "28px",
                letterSpacing: "0.04em",
                color: "var(--tomato, #E5462E)",
              }}
            >
              {friendCode}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "10px",
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "var(--ink-soft, #4A4742)",
              }}
            >
              {copied ? "Copied" : "Tap to copy"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
