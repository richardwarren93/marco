"use client";

import { useState } from "react";
import { DISPLAY, INK, MONO, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

interface AddFriendFormProps {
  onRequestSent: () => void;
}

export default function AddFriendForm({ onRequestSent }: AddFriendFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleCodeChange(val: string) {
    // Auto-format: uppercase, strip spaces
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setCode(cleaned);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_code: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send request");
        return;
      }

      setSuccess(`Friend request sent to ${data.friend_name}!`);
      setCode("");
      onRequestSent();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="friend-code"
          className="block text-[12.5px] mb-1.5"
          style={{ color: INK, fontWeight: 600 }}
        >
          Enter a friend code
        </label>
        <div className="flex gap-2">
          <input
            id="friend-code"
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="MARCO-XXXX"
            className="flex-1 min-w-0 px-3 py-2.5 text-sm outline-none"
            style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10, fontFamily: MONO, letterSpacing: "0.08em" }}
            maxLength={10}
          />
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="px-4 py-2 whitespace-nowrap active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 13.5, border: `2.5px solid ${INK}`, borderRadius: 10, boxShadow: `2px 3px 0 ${INK}` }}
          >
            {loading ? "Sending..." : "Add Friend"}
          </button>
        </div>
      </div>
      {error && <p className="text-[13px]" style={{ color: TOMATO_DARK, fontWeight: 600 }}>{error}</p>}
      {success && <p className="text-[13px]" style={{ color: INK, fontWeight: 600 }}>{success}</p>}
    </form>
  );
}
