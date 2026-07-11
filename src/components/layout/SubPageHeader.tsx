"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/* Header for profile sub-pages: back chevron + Fraunces title + optional right
   slot (e.g. a share button). Falls back to /profile when there's no history. */
export default function SubPageHeader({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <div
      className="flex items-center gap-2 px-3 pb-2 max-w-lg mx-auto"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <button
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/profile"))}
        aria-label="Back"
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors flex-shrink-0"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#1C1A17" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1
        className="flex-1 min-w-0 truncate"
        style={{
          color: "#1C1A17",
          fontSize: "22px",
          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
          fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 700',
        }}
      >
        {title}
      </h1>
      {right}
    </div>
  );
}
