"use client";

import { useState, useRef } from "react";

interface Props {
  onJoin: (code: string) => void;
  onCreateNew: () => void;
}

export default function JoinHouseholdStep({ onJoin, onCreateNew }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setError(null);
    setLoading(true);

    try {
      // Normalize: accept raw 4-char or HOUSE-XXXX
      const normalized = code.trim().toUpperCase();
      const fullCode = normalized.startsWith("HOUSE-")
        ? normalized
        : `HOUSE-${normalized}`;

      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: fullCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid invite code");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSuccess(data.household?.name || "Household");

      // Brief success animation, then advance
      setTimeout(() => {
        onJoin(fullCode);
      }, 1200);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full px-6 pb-24">
      <div className="pt-4 pb-6">
        <h1
          className="text-[28px] font-black tracking-tight"
          style={{ color: "#1a1410" }}
        >
          Cook with your{" "}
          <span style={{ color: "#ea580c" }}>household</span>
        </h1>
        <p className="text-sm mt-2" style={{ color: "#a09890" }}>
          Join an existing household to share recipes and meal plans
        </p>
      </div>

      {/* Join with code */}
      <div
        className="animate-stagger-in rounded-2xl p-5 mb-4"
        style={{
          background: "white",
          border: "2px solid #e8e8e5",
          animationDelay: "0.05s",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔗</span>
          <div>
            <p
              className="font-bold text-sm"
              style={{ color: "#1a1410" }}
            >
              Have an invite code?
            </p>
            <p className="text-xs" style={{ color: "#a09890" }}>
              Ask your household member for theirs
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onFocus={() => {
              setTimeout(() => {
                inputRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }, 300);
            }}
            placeholder="XXXX"
            maxLength={10}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-mono font-bold tracking-widest text-center bg-white outline-none uppercase"
            style={{
              border: error
                ? "2px solid #ef4444"
                : "2px solid #e8ddd3",
              color: "#1a1410",
              scrollMarginBottom: "120px",
            }}
          />
          <button
            onClick={handleJoin}
            disabled={!code.trim() || loading || !!success}
            className="px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ background: "#ea580c", color: "white" }}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : success ? (
              "✓"
            ) : (
              "Join"
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs mt-2 font-medium" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}

        {success && (
          <div
            className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2 animate-stagger-in"
            style={{ background: "#ecfdf5" }}
          >
            <span className="text-lg">🎉</span>
            <p className="text-xs font-semibold" style={{ color: "#059669" }}>
              Joined {success}! Setting up your account...
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4 animate-stagger-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex-1 h-px" style={{ background: "#e8e8e5" }} />
        <span className="text-xs font-semibold" style={{ color: "#c4b8aa" }}>
          OR
        </span>
        <div className="flex-1 h-px" style={{ background: "#e8e8e5" }} />
      </div>

      {/* Create new household */}
      <button
        onClick={onCreateNew}
        className="animate-stagger-in w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
        style={{
          animationDelay: "0.15s",
          background: "white",
          border: "2px solid #e8e8e5",
        }}
      >
        <span className="text-2xl">🏠</span>
        <div>
          <p className="font-bold text-sm" style={{ color: "#1a1410" }}>
            Start a new household
          </p>
          <p className="text-xs" style={{ color: "#a09890" }}>
            Set up your own and invite others later
          </p>
        </div>
        <span className="ml-auto text-lg" style={{ color: "#c4b8aa" }}>
          →
        </span>
      </button>

      <div className="flex-1" />
    </div>
  );
}
