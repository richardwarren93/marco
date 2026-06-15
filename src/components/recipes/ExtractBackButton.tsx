"use client";

// Prominent back control for the recipe-import entry screens (Paste link / Text).
// These render without the top nav bar; the parent container supplies the
// safe-area top inset so the button clears the status bar/notch.

import { useRouter } from "next/navigation";

export default function ExtractBackButton({
  onClick,
  label = "Back",
}: {
  onClick?: () => void;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={onClick ?? (() => router.back())}
      aria-label="Go back"
      className="inline-flex items-center gap-2 mb-5 active:scale-95 transition-transform"
      style={{ color: "var(--ink, #1C1A17)" }}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{ width: 40, height: 40, background: "var(--cream-warm, #EFE5D2)" }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold">{label}</span>
    </button>
  );
}
