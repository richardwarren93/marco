"use client";

import { useState } from "react";
import { useProfile } from "@/lib/hooks/use-data";
import type { UserProfile } from "@/types";
import { CREAM_WARM, DISPLAY, INK, INK_MUTED, MONO, PAPER, TOMATO } from "@/lib/theme";

type Mode = "view" | "enter_phone" | "enter_code";

export default function PhoneCard() {
  const { data: profileData, mutate: mutateProfile } = useProfile();
  const profile: UserProfile | null = profileData?.profile ?? null;

  const [mode, setMode] = useState<Mode>("view");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [unlinking, setUnlinking] = useState(false);

  const verified = Boolean(profile?.phone_verified_at && profile?.phone);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await fetch("/api/phone/start-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      if (data.devCode) {
        // Dev mode without Twilio configured — surface the code so it can be tested locally.
        setInfo(`Dev mode: code is ${data.devCode}`);
      } else {
        setInfo("Code sent. Check your texts.");
      }
      setMode("enter_code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/phone/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify");
      await mutateProfile();
      setMode("view");
      setCode("");
      setInfo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink() {
    if (!confirm("Unlink this phone number from Marco?")) return;
    setUnlinking(true);
    try {
      const res = await fetch("/api/phone/confirm", { method: "DELETE" });
      if (res.ok) await mutateProfile();
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <div className="p-4" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: INK }}>Text Marco</p>
          <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>
            {verified
              ? `Linked to ${profile!.phone}`
              : "Save & find recipes by text message"}
          </p>
        </div>
        {verified && (
          <button
            onClick={handleUnlink}
            disabled={unlinking}
            className="text-xs font-semibold active:scale-95 transition-transform" style={{ color: TOMATO }}
          >
            {unlinking ? "…" : "Unlink"}
          </button>
        )}
      </div>

      {!verified && mode === "view" && (
        <button
          onClick={() => { setMode("enter_phone"); setError(""); setInfo(""); }}
          className="mt-3 px-4 py-2 rounded-full text-xs active:scale-95 transition-transform"
          style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}
        >
          Verify your number
        </button>
      )}

      {mode === "enter_phone" && (
        <form onSubmit={handleStart} className="mt-3 space-y-2">
          {error && <div className="bg-red-50 text-red-600 p-2 rounded-xl text-xs">{error}</div>}
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="(555) 123-4567"
            autoFocus
            className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: CREAM_WARM, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
          />
          <p className="text-[11px] leading-relaxed" style={{ color: INK_MUTED }}>
            By tapping &quot;Send code&quot; you agree to receive transactional and conversational SMS from Marco
            (verification codes, recipe save confirmations, and replies to messages you initiate).
            Frequency varies by usage. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
            See our <a href="/privacy" target="_blank" className="underline">Privacy Policy</a> and <a href="/terms" target="_blank" className="underline">Terms</a>.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2 text-sm active:scale-[0.98] disabled:opacity-50 transition-transform"
              style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
            >
              {busy ? "Sending…" : "Send code"}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="px-4 py-2 text-sm active:scale-95 transition-transform"
              style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "enter_code" && (
        <form onSubmit={handleConfirm} className="mt-3 space-y-2">
          {info && <div className="bg-amber-50 text-amber-800 p-2 rounded-xl text-xs">{info}</div>}
          {error && <div className="bg-red-50 text-red-600 p-2 rounded-xl text-xs">{error}</div>}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            autoFocus
            placeholder="6-digit code"
            className="w-full px-3 py-2.5 text-sm outline-none tracking-widest text-center" style={{ background: CREAM_WARM, color: INK, border: `2px solid ${INK}`, borderRadius: 10, fontFamily: MONO }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || code.length < 4}
              className="flex-1 py-2 text-sm active:scale-[0.98] disabled:opacity-50 transition-transform"
              style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("enter_phone"); setCode(""); }}
              className="px-4 py-2 text-sm active:scale-95 transition-transform"
              style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
