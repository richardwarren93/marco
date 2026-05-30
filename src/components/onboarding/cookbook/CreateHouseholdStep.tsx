"use client";

// Combined household step (replaces the old Join + size/type pair). Two modes:
//   choose → join an existing household by code, or start a new one
//   create → name the household + set size/type, then actually create it
// On success it advances; the size/type are passed up for the onboarding payload.

import { useState, useRef } from "react";
import CookbookPage from "./CookbookPage";
import { CookbookButton } from "./CookbookControls";

const HOUSEHOLD_TYPES = [
  { id: "roommates", label: "Roommates", emoji: "\u{1F91D}" },
  { id: "partner", label: "Partner / Spouse", emoji: "\u{2764}️" },
  { id: "family", label: "Family with kids", emoji: "\u{1F46A}" },
  { id: "mixed", label: "Mixed household", emoji: "\u{1F3E0}" },
];

interface Props {
  size: number;
  type: string | null;
  pageNumber: number;
  onBack?: () => void;
  // joined=true when they joined an existing household by code; otherwise they
  // created a new one and size/type carry their answers.
  onComplete: (joined: boolean, size: number, type: string | null) => void;
}

export default function CreateHouseholdStep({ size: initSize, type: initType, pageNumber, onBack, onComplete }: Props) {
  const [mode, setMode] = useState<"choose" | "create">("choose");

  // Join-by-code state
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinedName, setJoinedName] = useState<string | null>(null);

  // Create-new state
  const [name, setName] = useState("");
  const [count, setCount] = useState(initSize || 1);
  const [hType, setHType] = useState(initType);
  const [creating, setCreating] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);

  async function handleJoin() {
    if (!code.trim()) return;
    setJoinError(null);
    setJoining(true);
    try {
      const normalized = code.trim().toUpperCase();
      const fullCode = normalized.startsWith("HOUSE-") ? normalized : `HOUSE-${normalized}`;
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: fullCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        setJoinError(data.error || "Invalid invite code");
        setJoining(false);
        return;
      }
      const data = await res.json();
      setJoinedName(data.household?.name || "Household");
      setTimeout(() => onComplete(true, 1, null), 1200);
    } catch {
      setJoinError("Something went wrong. Try again.");
      setJoining(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    // Best-effort create — store prefs and advance regardless so onboarding
    // never dead-ends on a household hiccup.
    try {
      await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "My Household" }),
      });
    } catch {
      /* non-blocking */
    }
    onComplete(false, count, count > 1 ? hType : null);
  }

  const decrement = () => setCount((c) => Math.max(1, c - 1));
  const increment = () => setCount((c) => Math.min(10, c + 1));

  // ── Create-new mode ──────────────────────────────────────────────────────
  if (mode === "create") {
    return (
      <CookbookPage
        sectionLabel="Your kitchen"
        questionLabel="New household"
        dropCap="N"
        title={
          <>
            ame your{" "}
            <em style={{ color: "#E5462E", fontStyle: "italic" }}>household</em>
          </>
        }
        subtitle="You can invite others once you're set up."
        pageNumber={pageNumber}
        onBack={() => setMode("choose")}
        footer={
          <CookbookButton onClick={handleCreate} disabled={creating || (count > 1 && !hType)}>
            {creating ? "Creating…" : "Create household"}
          </CookbookButton>
        }
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Smith Kitchen"
          className="w-full px-4 py-3 rounded-xl outline-none mb-5"
          style={{
            background: "rgba(255, 253, 247, 0.7)",
            border: "1px solid rgba(28, 26, 23, 0.18)",
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "16px",
            color: "#1C1A17",
          }}
        />

        {/* Size stepper */}
        <div className="flex items-center justify-center gap-8 py-2">
          <button
            onClick={decrement}
            disabled={count <= 1}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95 disabled:opacity-30"
            style={{ background: "rgba(255, 253, 247, 0.7)", border: "1px solid rgba(28, 26, 23, 0.18)", color: "#1C1A17" }}
          >
            −
          </button>
          <div className="text-center">
            <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 144, "wght" 700', fontSize: "64px", color: "#1C1A17", lineHeight: 1 }}>
              {count}
            </span>
            <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "rgba(28, 26, 23, 0.55)" }}>
              {count === 1 ? "person" : "people"}
            </p>
          </div>
          <button
            onClick={increment}
            disabled={count >= 10}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95 disabled:opacity-30"
            style={{ background: "#E5462E", border: "1.5px solid #E5462E", color: "white" }}
          >
            +
          </button>
        </div>

        {count > 1 && (
          <div className="mt-4" style={{ animation: "cookbook-ink-fade-in 0.5s ease-out both" }}>
            <p className="mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "14px", color: "rgba(28, 26, 23, 0.65)" }}>
              What best describes your household?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {HOUSEHOLD_TYPES.map((t) => {
                const isSelected = hType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setHType(t.id)}
                    className="flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.97]"
                    style={{
                      borderRadius: 12,
                      background: isSelected ? "rgba(229, 70, 46, 0.08)" : "rgba(255, 253, 247, 0.55)",
                      border: isSelected ? "1.5px solid #E5462E" : "1px solid rgba(28, 26, 23, 0.14)",
                    }}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 500', fontSize: "13px", color: isSelected ? "#E5462E" : "#1C1A17" }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CookbookPage>
    );
  }

  // ── Choose mode ──────────────────────────────────────────────────────────
  return (
    <CookbookPage
      sectionLabel="Your kitchen"
      questionLabel="Household"
      dropCap="C"
      title={
        <>
          ook with your{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>household</em>
        </>
      }
      subtitle="Share recipes, meal plans and groceries with the people you cook for."
      pageNumber={pageNumber}
      onBack={onBack}
    >
      {/* Join with code */}
      <div className="p-4 mb-4" style={{ borderRadius: 12, background: "rgba(255, 253, 247, 0.6)", border: "1px solid rgba(28, 26, 23, 0.14)" }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🔗</span>
          <div>
            <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 600', fontSize: "15px", color: "#1C1A17" }}>
              Have an invite code?
            </p>
            <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12.5px", color: "rgba(28, 26, 23, 0.55)" }}>
              Ask your household member for theirs
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            ref={codeRef}
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setJoinError(null); }}
            placeholder="XXXX"
            maxLength={10}
            className="flex-1 px-4 py-3 rounded-xl font-mono font-bold tracking-widest text-center outline-none uppercase"
            style={{
              background: "rgba(255, 253, 247, 0.9)",
              border: joinError ? "1.5px solid #ef4444" : "1px solid rgba(28, 26, 23, 0.18)",
              color: "#1C1A17",
              fontSize: "15px",
            }}
          />
          <button
            onClick={handleJoin}
            disabled={!code.trim() || joining || !!joinedName}
            className="px-5 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ background: "#E5462E" }}
          >
            {joining ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : joinedName ? "✓" : "Join"}
          </button>
        </div>
        {joinError && (
          <p className="mt-2" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12.5px", color: "#ef4444" }}>{joinError}</p>
        )}
        {joinedName && (
          <div className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: "#ecfdf5" }}>
            <span className="text-lg">🎉</span>
            <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 600', fontSize: "12.5px", color: "#059669" }}>
              Joined {joinedName}! Setting up your account…
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px" style={{ background: "rgba(28, 26, 23, 0.14)" }} />
        <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: "10px", letterSpacing: "0.3em", color: "rgba(28, 26, 23, 0.4)" }}>OR</span>
        <div className="flex-1 h-px" style={{ background: "rgba(28, 26, 23, 0.14)" }} />
      </div>

      <button
        onClick={() => setMode("create")}
        className="w-full flex items-center gap-3.5 p-4 text-left transition-all active:scale-[0.98]"
        style={{ borderRadius: 12, background: "rgba(255, 253, 247, 0.55)", border: "1px solid rgba(28, 26, 23, 0.14)" }}
      >
        <span className="text-2xl">🏠</span>
        <div className="flex-1">
          <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 600', fontSize: "15px", color: "#1C1A17" }}>
            Start a new household
          </p>
          <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12.5px", color: "rgba(28, 26, 23, 0.55)" }}>
            Name it, set the size, invite others later
          </p>
        </div>
        <span style={{ color: "rgba(28, 26, 23, 0.4)", fontSize: 18 }}>→</span>
      </button>

      <button
        onClick={() => onComplete(false, 1, null)}
        className="w-full flex items-center gap-3.5 p-4 mt-2.5 text-left transition-all active:scale-[0.98]"
        style={{ borderRadius: 12, background: "rgba(255, 253, 247, 0.55)", border: "1px solid rgba(28, 26, 23, 0.14)" }}
      >
        <span className="text-2xl">🍳</span>
        <div className="flex-1">
          <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 600', fontSize: "15px", color: "#1C1A17" }}>
            It&apos;s just me
          </p>
          <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12.5px", color: "rgba(28, 26, 23, 0.55)" }}>
            Cooking solo — you can add others anytime
          </p>
        </div>
        <span style={{ color: "rgba(28, 26, 23, 0.4)", fontSize: 18 }}>→</span>
      </button>
    </CookbookPage>
  );
}
