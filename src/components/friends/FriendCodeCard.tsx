"use client";

import { useState } from "react";

interface FriendCodeCardProps {
  friendCode: string;
  displayName: string;
}

export default function FriendCodeCard({
  friendCode,
  displayName,
}: FriendCodeCardProps) {
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

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-6 text-center">
      <p className="text-sm text-gray-600 mb-1">Your friend code</p>
      <p className="text-3xl font-bold text-orange-600 tracking-widest mb-1">
        {friendCode}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Share this code so {displayName}&apos;s friends can find you
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
        <button
          onClick={handleShare}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          Share
        </button>
      </div>
    </div>
  );
}
